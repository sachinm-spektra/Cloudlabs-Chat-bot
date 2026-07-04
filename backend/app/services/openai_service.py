import re
from typing import Any
from openai import AsyncAzureOpenAI
from ..core.config import get_settings

settings = get_settings()

_client: AsyncAzureOpenAI | None = None


def _get_client() -> AsyncAzureOpenAI:
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
        )
    return _client


BASE_SYSTEM_PROMPT = """You are the CloudLabs AI Assistant — a helpful support agent for CloudLabs customers.
Answer questions about lab provisioning, deployments, LMS integration, billing, and Azure Lab Services.
Ground your answers in the retrieved knowledge context provided.
If the context does not contain relevant information, say so honestly.
Keep responses concise, clear, and actionable. Format using markdown where helpful.
Do not make up information."""

# Shown to end users in the customer-facing chat widget: steer them to the in-app escalation
# path instead of surfacing staff email addresses that may appear in ingested knowledge docs.
CONTACT_RESTRICTION_PROMPT = """
Never share personal email addresses, phone numbers, or tell the user to email someone for support — even if such details appear in the retrieved context. If you cannot resolve the issue, or the user asks how to reach support, tell them to click the "Raise Support Ticket" button in the top-right of this chat so the support team can follow up directly."""

FALLBACK_CONTACT_PROMPT = "\nIf uncertain, recommend contacting the support team."


async def get_openai_response(
    question: str,
    history: list[Any],
    chunks: list[dict],
    attachment_context: str = "",
    restrict_contact_info: bool = True,
) -> dict:
    if not settings.azure_openai_endpoint:
        return {
            "content": (
                f"I received your question: *{question}*\n\n"
                "Azure OpenAI is not configured in this environment. "
                "Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY."
            ),
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }

    client = _get_client()

    # Build context from retrieved chunks
    context_text = ""
    if chunks:
        context_parts = []
        for i, c in enumerate(chunks[:5], 1):
            context_parts.append(f"[{i}] {c.get('source_title', '')}: {c.get('content', '')}")
        context_text = "\n\n".join(context_parts)

    system_prompt = BASE_SYSTEM_PROMPT + (
        CONTACT_RESTRICTION_PROMPT if restrict_contact_info else FALLBACK_CONTACT_PROMPT
    )
    messages = [{"role": "system", "content": system_prompt}]

    if context_text:
        messages.append({
            "role": "system",
            "content": f"Retrieved knowledge context:\n\n{context_text}",
        })

    if attachment_context:
        messages.append({
            "role": "system",
            "content": f"Uploaded document content:{attachment_context}",
        })

    for msg in history[-8:]:
        messages.append({"role": msg.role.value, "content": msg.content})

    try:
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment_name,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        choice = response.choices[0]
        raw_content = choice.message.content or ""
        # Strip AI-generated citation reference lines (e.g. "- [Context Reference](#4, #5)")
        cleaned = re.sub(r'\n?-?\s*\[Context Reference[^\]]*\]\([^)]*\)', '', raw_content)
        cleaned = cleaned.strip()
        return {
            "content": cleaned,
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        }
    except Exception:
        return {
            "content": (
                "I'm unable to reach the AI service at the moment. "
                "Please ensure your Azure OpenAI credentials are correctly set in the backend `.env` file "
                "and restart the backend container.\n\n"
                "In the meantime, you can raise a support ticket and our team will assist you."
            ),
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }


async def get_embedding(text: str) -> list[float]:
    if not settings.azure_openai_endpoint:
        return [0.0] * 3072

    client = _get_client()
    response = await client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=text,
    )
    return response.data[0].embedding


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single API call (up to 2048 inputs)."""
    if not settings.azure_openai_endpoint:
        return [[0.0] * 3072 for _ in texts]

    client = _get_client()
    # Azure OpenAI supports batching; split into chunks of 16 to stay within token limits
    BATCH = 16
    all_vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH):
        batch = texts[i: i + BATCH]
        response = await client.embeddings.create(
            model=settings.azure_openai_embedding_deployment,
            input=batch,
        )
        # Results are returned in order
        all_vectors.extend(item.embedding for item in sorted(response.data, key=lambda x: x.index))
    return all_vectors
