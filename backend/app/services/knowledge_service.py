import re
import json
from azure.storage.blob.aio import BlobServiceClient
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
)
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from ..core.config import get_settings
from .openai_service import get_embeddings_batch
from .ingestion_service import extract_text

settings = get_settings()

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
VECTOR_DIM = 3072  # text-embedding-3-large

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".md", ".txt", ".xlsx", ".xls"}

CONTENT_TYPE_MAP = {
    ".pdf":  "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc":  "application/msword",
    ".md":   "text/markdown",
    ".txt":  "text/plain",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls":  "application/vnd.ms-excel",
}


def _blob_svc() -> BlobServiceClient | None:
    if not settings.azure_storage_connection_string:
        return None
    return BlobServiceClient.from_connection_string(settings.azure_storage_connection_string)


def _index_client() -> SearchIndexClient | None:
    if not settings.azure_search_endpoint:
        return None
    return SearchIndexClient(
        endpoint=settings.azure_search_endpoint,
        credential=AzureKeyCredential(settings.azure_search_api_key),
    )


def _search_client() -> SearchClient | None:
    if not settings.azure_search_endpoint:
        return None
    return SearchClient(
        endpoint=settings.azure_search_endpoint,
        index_name=settings.azure_search_index_name,
        credential=AzureKeyCredential(settings.azure_search_api_key),
    )


async def ensure_search_index() -> None:
    """Create the AI Search index with vector search support if it doesn't exist."""
    client = _index_client()
    if not client:
        return
    try:
        try:
            await client.get_index(settings.azure_search_index_name)
            return
        except ResourceNotFoundError:
            pass

        index = SearchIndex(
            name=settings.azure_search_index_name,
            fields=[
                SearchField(name="id", type=SearchFieldDataType.String, key=True, searchable=False),
                SearchField(
                    name="content",
                    type=SearchFieldDataType.String,
                    searchable=True,
                    retrievable=True,
                    analyzer_name="standard.lucene",
                ),
                SearchField(
                    name="content_vector",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    searchable=True,
                    retrievable=False,
                    vector_search_dimensions=VECTOR_DIM,
                    vector_search_profile_name="hnsw-profile",
                ),
                SearchField(name="source_title", type=SearchFieldDataType.String, searchable=True, filterable=True, retrievable=True),
                SearchField(name="source_url",   type=SearchFieldDataType.String, searchable=False, retrievable=True),
                SearchField(name="blob_name",    type=SearchFieldDataType.String, searchable=False, filterable=True, retrievable=True),
                SearchField(name="chunk_index",  type=SearchFieldDataType.Int32,  searchable=False, retrievable=True),
                SearchField(name="metadata",     type=SearchFieldDataType.String, searchable=False, retrievable=True),
            ],
            vector_search=VectorSearch(
                profiles=[VectorSearchProfile(name="hnsw-profile", algorithm_configuration_name="hnsw-config")],
                algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
            ),
        )
        await client.create_index(index)
    finally:
        await client.close()


def _chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks on paragraph boundaries."""
    if not text.strip():
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if current and len(current) + len(para) + 2 > CHUNK_SIZE:
            chunks.append(current.strip())
            overlap = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
            current = (overlap + "\n\n" + para).strip()
        else:
            current = (current + "\n\n" + para).strip() if current else para

    if current.strip():
        chunks.append(current.strip())

    # Hard-split any oversized chunks
    final: list[str] = []
    for chunk in chunks:
        if len(chunk) <= CHUNK_SIZE * 2:
            final.append(chunk)
        else:
            for i in range(0, len(chunk), CHUNK_SIZE - CHUNK_OVERLAP):
                part = chunk[i: i + CHUNK_SIZE]
                if part.strip():
                    final.append(part)

    return final


def _chunk_id(blob_name: str, index: int) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", blob_name)
    return f"{safe}__{index}"


async def upload_knowledge_blob(content: bytes, filename: str, content_type: str) -> str:
    """Upload a file to the knowledge prefix in the storage container. Returns blob_name."""
    import re as _re
    safe_name = _re.sub(r"[^\w.\-]", "_", filename)
    blob_name = f"knowledge/{safe_name}"
    svc = _blob_svc()
    if not svc:
        return blob_name
    try:
        container = svc.get_container_client(settings.azure_storage_container_name)
        blob = container.get_blob_client(blob_name)
        await blob.upload_blob(content, content_settings={"content_type": content_type}, overwrite=True)
    except Exception:
        pass
    finally:
        await svc.close()
    return blob_name


async def list_blobs() -> list[dict]:
    """List all knowledge-base files in the storage container."""
    svc = _blob_svc()
    if not svc:
        return []
    results = []
    try:
        container = svc.get_container_client(settings.azure_storage_container_name)
        async for blob in container.list_blobs():
            ext = ("." + blob.name.rsplit(".", 1)[-1].lower()) if "." in blob.name else ""
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            results.append({
                "blob_name": blob.name,
                "size": blob.size,
                "last_modified": blob.last_modified.isoformat() if blob.last_modified else None,
            })
    except Exception:
        pass
    finally:
        await svc.close()
    return results


async def get_indexed_chunk_counts() -> dict[str, int]:
    """Return {blob_name: chunk_count} for all indexed blobs."""
    client = _search_client()
    if not client:
        return {}
    counts: dict[str, int] = {}
    try:
        results = await client.search(search_text="*", select=["blob_name"], top=1000)
        async for r in results:
            name = r.get("blob_name")
            if name:
                counts[name] = counts.get(name, 0) + 1
    except Exception:
        pass
    finally:
        await client.close()
    return counts


async def delete_blob_chunks(blob_name: str) -> int:
    """Remove all index chunks for a blob. Returns count deleted."""
    client = _search_client()
    if not client:
        return 0
    deleted = 0
    try:
        escaped = blob_name.replace("'", "''")
        results = await client.search(
            search_text="*",
            filter=f"blob_name eq '{escaped}'",
            select=["id"],
            top=1000,
        )
        ids = []
        async for r in results:
            ids.append({"id": r["id"]})
        if ids:
            await client.delete_documents(documents=ids)
            deleted = len(ids)
    except Exception:
        pass
    finally:
        await client.close()
    return deleted


async def ingest_blob(blob_name: str) -> dict:
    """Download one blob, extract text, chunk, embed, and index it."""
    svc = _blob_svc()
    if not svc:
        return {"blob_name": blob_name, "chunks": 0, "error": "Storage not configured"}

    # Download
    try:
        container = svc.get_container_client(settings.azure_storage_container_name)
        bc = container.get_blob_client(blob_name)
        download = await bc.download_blob()
        content = await download.readall()
        blob_url = bc.url
    except Exception as e:
        return {"blob_name": blob_name, "chunks": 0, "error": f"Download failed: {e}"}
    finally:
        await svc.close()

    # Extract text
    ext = ("." + blob_name.rsplit(".", 1)[-1].lower()) if "." in blob_name else ""
    if ext == ".txt":
        text = content.decode("utf-8", errors="replace")
    else:
        text = await extract_text(content, blob_name, CONTENT_TYPE_MAP.get(ext, ""))

    if not text or not text.strip():
        return {"blob_name": blob_name, "chunks": 0, "error": "No text could be extracted"}

    # Chunk
    chunks = _chunk_text(text)
    if not chunks:
        return {"blob_name": blob_name, "chunks": 0, "error": "No chunks produced"}

    # Batch embed all chunks in one API call
    try:
        vectors = await get_embeddings_batch(chunks)
    except Exception as e:
        return {"blob_name": blob_name, "chunks": 0, "error": f"Embedding failed: {e}"}

    # Delete old chunks then upload new ones
    await delete_blob_chunks(blob_name)

    source_title = blob_name.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    documents = [
        {
            "id": _chunk_id(blob_name, i),
            "content": chunk,
            "content_vector": vectors[i],
            "source_title": source_title,
            "source_url": blob_url,
            "blob_name": blob_name,
            "chunk_index": i,
            "metadata": json.dumps({"size": len(content), "ext": ext, "total_chunks": len(chunks)}),
        }
        for i, chunk in enumerate(chunks)
    ]

    sc = _search_client()
    if not sc:
        return {"blob_name": blob_name, "chunks": 0, "error": "Search not configured"}

    indexed = 0
    try:
        # Upload in batches of 100
        for start in range(0, len(documents), 100):
            await sc.upload_documents(documents=documents[start: start + 100])
            indexed += len(documents[start: start + 100])
    except Exception as e:
        return {"blob_name": blob_name, "chunks": indexed, "error": f"Index upload failed: {e}"}
    finally:
        await sc.close()

    return {"blob_name": blob_name, "chunks": indexed, "error": None}


async def ingest_all() -> dict:
    """Ingest every supported file from the storage container."""
    try:
        await ensure_search_index()
    except Exception as e:
        return {"total_files": 0, "indexed_files": 0, "total_chunks": 0, "errors": [str(e)]}

    blobs = await list_blobs()
    if not blobs:
        return {"total_files": 0, "indexed_files": 0, "total_chunks": 0, "errors": ["No supported files in container"]}

    total_chunks = 0
    indexed_files = 0
    errors: list[str] = []

    for blob in blobs:
        result = await ingest_blob(blob["blob_name"])
        if result.get("error"):
            errors.append(f"{blob['blob_name']}: {result['error']}")
        else:
            indexed_files += 1
            total_chunks += result["chunks"]

    return {
        "total_files": len(blobs),
        "indexed_files": indexed_files,
        "total_chunks": total_chunks,
        "errors": errors,
    }
