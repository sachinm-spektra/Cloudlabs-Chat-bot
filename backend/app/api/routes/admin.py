from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from ...core.database import get_db
from ...models.user import User
from ...models.chat import Session, ChatMessage, Citation, SessionStatus, MessageRole
from ...models.ticket import Ticket, TicketStatus, TokenUsageLog, SatisfactionFeedback
from ...schemas.ticket import AdminMetrics, ActivityItem, TicketRead, TicketListResponse, TokenUsagePoint
from ...schemas.chat import MessageRead, SessionRead
from ..dependencies import get_admin_user
from sqlalchemy.orm import selectinload
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=AdminMetrics)
async def get_metrics(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_sessions = (await db.execute(select(func.count(Session.id)))).scalar_one()
    active_sessions = (
        await db.execute(select(func.count(Session.id)).where(Session.status == SessionStatus.active))
    ).scalar_one()

    resolved_ai = (
        await db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.status.in_([TicketStatus.resolved_by_ai, TicketStatus.closed])
            )
        )
    ).scalar_one()

    open_tickets = (
        await db.execute(select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.open))
    ).scalar_one()

    transferred = (
        await db.execute(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.transferred_to_support)
        )
    ).scalar_one()

    total_tickets = (await db.execute(select(func.count(Ticket.id)))).scalar_one()
    resolution_rate = (resolved_ai / total_tickets * 100) if total_tickets else 0.0

    avg_sat = (
        await db.execute(select(func.avg(SatisfactionFeedback.rating)))
    ).scalar_one() or 0.0

    prompt_t = (await db.execute(select(func.sum(TokenUsageLog.prompt_tokens)))).scalar_one() or 0
    comp_t = (await db.execute(select(func.sum(TokenUsageLog.completion_tokens)))).scalar_one() or 0

    # Real knowledge stats from search index / storage
    from ...services.knowledge_service import get_indexed_chunk_counts, list_blobs
    from ...core.config import get_settings as _get_settings
    _settings = _get_settings()
    try:
        counts = await get_indexed_chunk_counts()
        knowledge_articles = len(counts)  # number of unique indexed blobs
    except Exception:
        knowledge_articles = 0

    # Count configured Azure services
    connected_sources = sum([
        bool(_settings.azure_storage_connection_string and "your-account" not in _settings.azure_storage_connection_string),
        bool(_settings.azure_search_endpoint and "your-search" not in _settings.azure_search_endpoint),
        bool(_settings.azure_openai_endpoint and "your-resource" not in _settings.azure_openai_endpoint),
    ])

    # Search success rate = % of AI messages that returned at least 1 citation
    from ...models.chat import Citation
    total_ai_msgs = (
        await db.execute(select(func.count(ChatMessage.id)).where(ChatMessage.role == MessageRole.assistant))
    ).scalar_one()
    msgs_with_citations = (
        await db.execute(
            select(func.count(func.distinct(Citation.message_id)))
        )
    ).scalar_one()
    search_success_rate = round((msgs_with_citations / total_ai_msgs * 100), 1) if total_ai_msgs else 0.0

    return AdminMetrics(
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        tickets_resolved_by_ai=resolved_ai,
        open_tickets=open_tickets,
        transferred_tickets=transferred,
        resolution_rate=round(resolution_rate, 1),
        avg_satisfaction=round(float(avg_sat), 2),
        total_tokens=prompt_t + comp_t,
        prompt_tokens=prompt_t,
        completion_tokens=comp_t,
        knowledge_articles=knowledge_articles,
        search_success_rate=search_success_rate,
        connected_sources=connected_sources,
        resolved_queries=resolved_ai,
    )


@router.get("/tickets", response_model=TicketListResponse)
async def get_tickets(
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Ticket).options(selectinload(Ticket.user))
    if status:
        try:
            q = q.where(Ticket.status == TicketStatus(status))
        except ValueError:
            pass
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    tickets_res = await db.execute(q.order_by(Ticket.created_at.desc()).offset((page - 1) * limit).limit(limit))
    tickets = tickets_res.scalars().all()

    ticket_reads = []
    for t in tickets:
        # Get last message
        msg_res = await db.execute(
            select(ChatMessage).where(ChatMessage.session_id == t.session_id).order_by(ChatMessage.created_at.desc()).limit(1)
        )
        last = msg_res.scalar_one_or_none()
        count_res = await db.execute(select(func.count(ChatMessage.id)).where(ChatMessage.session_id == t.session_id))
        count = count_res.scalar_one()

        ticket_reads.append(
            TicketRead(
                id=t.id,
                session_id=t.session_id,
                user_id=t.user_id,
                user_name=t.user.name if t.user else None,
                user_email=t.user.email if t.user else None,
                status=t.status,
                lab_name=t.lab_name,
                deployment_id=t.deployment_id,
                created_at=t.created_at,
                updated_at=t.updated_at,
                message_count=count,
                last_message=last.content[:100] if last else None,
            )
        )
    return TicketListResponse(tickets=ticket_reads, total=total)


@router.get("/sessions", response_model=dict)
async def get_sessions(
    page: int = 1,
    limit: int = 20,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(Session.id)))).scalar_one()
    res = await db.execute(
        select(Session).order_by(Session.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    sessions = res.scalars().all()
    return {
        "sessions": [SessionRead.model_validate(s) for s in sessions],
        "total": total,
    }


@router.get("/sessions/{session_id}/messages", response_model=list[MessageRead])
async def get_session_messages(
    session_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return res.scalars().all()


@router.post("/tickets/{ticket_id}/transfer", status_code=200)
async def transfer_ticket(
    ticket_id: str,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.ticket import TicketTransfer
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = TicketStatus.transferred_to_support
    transfer = TicketTransfer(ticket_id=ticket_id, transferred_by=current_user.id)
    db.add(transfer)
    return {"status": "transferred"}


@router.get("/activity", response_model=list[ActivityItem])
async def get_activity(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ChatMessage, User, Ticket)
        .join(Session, ChatMessage.session_id == Session.id)
        .join(User, Session.user_id == User.id)
        .outerjoin(Ticket, Ticket.session_id == ChatMessage.session_id)
        .where(ChatMessage.role == MessageRole.user)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    rows = res.all()
    items = []
    for msg, user, ticket in rows:
        initials = "".join(p[0] for p in user.name.split()[:2]).upper()
        items.append(
            ActivityItem(
                id=msg.id,
                user_name=user.name,
                user_initials=initials,
                action="asked agent",
                detail=f'"{msg.content[:60]}{"..." if len(msg.content) > 60 else ""}"',
                timestamp=msg.created_at.isoformat(),
                ticket_id=ticket.id if ticket else None,
            )
        )
    return items


@router.get("/tickets/status-breakdown", response_model=dict[str, int])
async def get_ticket_status_breakdown(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status))
    counts = {status.value: 0 for status in TicketStatus}
    for status, count in res.all():
        counts[status.value] = count
    return counts


@router.get("/token-usage", response_model=list[TokenUsagePoint])
async def get_token_usage(
    days: int = 30,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    res = await db.execute(
        select(
            func.date(TokenUsageLog.created_at).label("date"),
            func.sum(TokenUsageLog.prompt_tokens).label("prompt_tokens"),
            func.sum(TokenUsageLog.completion_tokens).label("completion_tokens"),
        )
        .where(TokenUsageLog.created_at >= since)
        .group_by(func.date(TokenUsageLog.created_at))
        .order_by(func.date(TokenUsageLog.created_at))
    )
    rows = res.all()
    return [
        TokenUsagePoint(
            date=str(r.date),
            prompt_tokens=r.prompt_tokens or 0,
            completion_tokens=r.completion_tokens or 0,
            total_tokens=(r.prompt_tokens or 0) + (r.completion_tokens or 0),
        )
        for r in rows
    ]


# ── Knowledge Base ────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    blob_name: str | None = None


@router.get("/knowledge/config-status")
async def knowledge_config_status(_: User = Depends(get_admin_user)):
    from ...core.config import get_settings
    s = get_settings()
    cs = s.azure_storage_connection_string or ""
    se = s.azure_search_endpoint or ""
    oe = s.azure_openai_endpoint or ""
    return {
        "storage_configured": bool(cs) and "your-account" not in cs,
        "search_configured": bool(se) and "your-search" not in se,
        "openai_configured": bool(oe) and "your-resource" not in oe,
        "storage_container": s.azure_storage_container_name or "uploads",
    }


@router.get("/knowledge/blobs")
async def list_knowledge_blobs(_: User = Depends(get_admin_user)):
    from ...services.knowledge_service import list_blobs, get_indexed_chunk_counts
    blobs = await list_blobs()
    counts = await get_indexed_chunk_counts()
    for b in blobs:
        b["chunks"] = counts.get(b["blob_name"], 0)
        b["indexed"] = b["blob_name"] in counts
    return blobs


@router.post("/knowledge/ingest")
async def ingest_knowledge(
    payload: IngestRequest = IngestRequest(),
    _: User = Depends(get_admin_user),
):
    from ...services.knowledge_service import ingest_blob, ingest_all, ensure_search_index
    await ensure_search_index()
    if payload.blob_name:
        return await ingest_blob(payload.blob_name)
    return await ingest_all()


@router.delete("/knowledge/blobs/{blob_name:path}")
async def delete_knowledge_blob(
    blob_name: str,
    _: User = Depends(get_admin_user),
):
    from ...services.knowledge_service import delete_blob_chunks
    deleted = await delete_blob_chunks(blob_name)
    return {"deleted_chunks": deleted}


KNOWLEDGE_ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/markdown",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
KNOWLEDGE_ALLOWED_EXTS = {".pdf", ".docx", ".doc", ".md", ".txt", ".xlsx", ".xls"}


@router.post("/knowledge/upload")
async def upload_knowledge_file(
    file: UploadFile = File(...),
    _: User = Depends(get_admin_user),
):
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in KNOWLEDGE_ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(KNOWLEDGE_ALLOWED_EXTS)}",
        )
    content = await file.read()
    from ...services.knowledge_service import upload_knowledge_blob
    blob_name = await upload_knowledge_blob(content, file.filename or "upload", file.content_type or "application/octet-stream")
    return {"blob_name": blob_name, "size": len(content)}


@router.get("/tickets/open-count")
async def get_open_ticket_count(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Only count tickets explicitly raised to support (not AI-only sessions)
    count = (
        await db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.status.in_([
                    TicketStatus.open,
                    TicketStatus.transferred_to_support,
                    TicketStatus.l2_escalated,
                    TicketStatus.owner_escalated,
                ])
            )
        )
    ).scalar_one()
    return {"count": count}


@router.get("/tickets/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Ticket).options(selectinload(Ticket.user)).where(Ticket.id == ticket_id))
    t = res.scalar_one_or_none()
    if not t:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    count_res = await db.execute(select(func.count(ChatMessage.id)).where(ChatMessage.session_id == t.session_id))
    count = count_res.scalar_one()
    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == t.session_id).order_by(ChatMessage.created_at.desc()).limit(1)
    )
    last = msg_res.scalar_one_or_none()
    return TicketRead(
        id=t.id,
        session_id=t.session_id,
        user_id=t.user_id,
        user_name=t.user.name if t.user else None,
        user_email=t.user.email if t.user else None,
        status=t.status,
        lab_name=t.lab_name,
        deployment_id=t.deployment_id,
        created_at=t.created_at,
        updated_at=t.updated_at,
        message_count=count,
        last_message=last.content[:100] if last else None,
    )


class AdminMessageRequest(BaseModel):
    content: str


class TicketStatusUpdateRequest(BaseModel):
    status: str


@router.put("/tickets/{ticket_id}/status", status_code=200)
async def update_ticket_status(
    ticket_id: str,
    body: TicketStatusUpdateRequest,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    try:
        ticket.status = TicketStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    await db.commit()
    return {"status": body.status}


@router.post("/sessions/{session_id}/messages")
async def admin_send_message(
    session_id: str,
    body: AdminMessageRequest,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.chat import ChatMessage, MessageRole
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update ticket status to transferred_to_support if still open, so user sees support replied
    ticket_res = await db.execute(select(Ticket).where(Ticket.session_id == session_id))
    ticket = ticket_res.scalar_one_or_none()
    if ticket and ticket.status == TicketStatus.open:
        ticket.status = TicketStatus.transferred_to_support

    msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=MessageRole.assistant,
        content=f"[Support:{current_admin.name}] {body.content}",
        prompt_tokens=0,
        completion_tokens=0,
    )
    db.add(msg)
    await db.commit()
    # Reload with eager-loaded relationships to avoid MissingGreenlet in async context
    res2 = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.id == msg.id)
    )
    loaded = res2.scalar_one()
    from ...schemas.chat import MessageRead
    return MessageRead.model_validate(loaded)


@router.put("/sessions/{session_id}/messages/{message_id}")
async def admin_edit_message(
    session_id: str,
    message_id: str,
    body: AdminMessageRequest,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.chat import ChatMessage
    res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
    )
    msg = res.scalar_one_or_none()
    if not msg or not msg.content.startswith("[Support"):
        raise HTTPException(status_code=404, detail="Support message not found")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    prefix = msg.content.split("]", 1)[0] + "]"
    msg.content = f"{prefix} {content}"
    await db.commit()

    res2 = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.id == msg.id)
    )
    from ...schemas.chat import MessageRead
    return MessageRead.model_validate(res2.scalar_one())


@router.delete("/sessions/{session_id}/messages/{message_id}")
async def admin_delete_message(
    session_id: str,
    message_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.chat import ChatMessage
    res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
    )
    msg = res.scalar_one_or_none()
    if not msg or not msg.content.startswith("[Support"):
        raise HTTPException(status_code=404, detail="Support message not found")

    await db.delete(msg)
    await db.commit()
    return {"status": "deleted"}


# ── Ticket Escalation ────────────────────────────────────────────────────────

@router.post("/tickets/{ticket_id}/escalate-l2", status_code=200)
async def escalate_to_l2(
    ticket_id: str,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.ticket import TicketTransfer
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = TicketStatus.l2_escalated
    transfer = TicketTransfer(ticket_id=ticket_id, transferred_by=current_admin.id, notes="Escalated to L2 Engineer")
    db.add(transfer)
    await db.commit()
    return {"status": "l2_escalated"}


@router.post("/tickets/{ticket_id}/escalate-owner", status_code=200)
async def escalate_to_owner(
    ticket_id: str,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...models.ticket import TicketTransfer
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = TicketStatus.owner_escalated
    transfer = TicketTransfer(ticket_id=ticket_id, transferred_by=current_admin.id, notes="Escalated to Lab Owner")
    db.add(transfer)
    await db.commit()
    return {"status": "owner_escalated"}


# ── Admin AI Query (real AI, not broken session lookup) ───────────────────────

class AdminAIQueryRequest(BaseModel):
    question: str
    session_id: str | None = None  # optional: load user session as context


@router.post("/ai-query")
async def admin_ai_query(
    payload: AdminAIQueryRequest,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from ...services.search_service import retrieve_chunks
    from ...services.openai_service import get_openai_response

    history = []
    if payload.session_id:
        hist_res = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == payload.session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(12)
        )
        history = list(reversed(hist_res.scalars().all()))

    chunks = await retrieve_chunks(payload.question)
    ai_response = await get_openai_response(
        question=payload.question,
        history=history,
        chunks=chunks,
        attachment_context="",
        restrict_contact_info=False,
    )
    citations = [
        {"source_title": c.get("source_title", ""), "source_url": c.get("source_url")}
        for c in chunks
        if c.get("source_title")
    ]
    return {"content": ai_response["content"], "citations": citations}
