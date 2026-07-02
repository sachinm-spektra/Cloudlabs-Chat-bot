import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from ...core.database import get_db
from ...models.user import User
from ...models.chat import Session, ChatMessage, Citation, MessageRole, SessionStatus
from ...models.ticket import Ticket, TicketStatus, SatisfactionFeedback
from ...models.attachment import Attachment
from ...schemas.chat import MessageRead, SendMessageRequest, CloseSessionRequest, SessionWithTicket, UpdateMessageRequest
from ...schemas.ticket import TicketRead
from ..dependencies import get_current_user
from ...services.openai_service import get_openai_response
from ...services.search_service import retrieve_chunks
from ...services.summary_service import generate_summary

router = APIRouter(prefix="/sessions", tags=["chat"])


@router.post("", response_model=SessionWithTicket, status_code=201)
async def create_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = Session(user_id=current_user.id)
    db.add(session)
    await db.flush()

    ticket = Ticket(session_id=session.id, user_id=current_user.id)
    db.add(ticket)
    await db.flush()

    session.ticket_id = ticket.id

    # Add welcome message
    welcome = ChatMessage(
        session_id=session.id,
        role=MessageRole.assistant,
        content=(
            "👋 Hi! I am **Alita**, your CloudLabs buddy. I am here to help "
            "with lab provisioning, deployments, LMS integration, billing, "
            "Azure migration, and more. What do you need help with today?"
        ),
    )
    db.add(welcome)
    await db.flush()

    ticket_read = TicketRead(
        id=ticket.id,
        session_id=ticket.session_id,
        user_id=ticket.user_id,
        user_name=current_user.name,
        user_email=current_user.email,
        status=ticket.status,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )
    from ...schemas.chat import SessionRead
    session_read = SessionRead(
        id=session.id,
        user_id=session.user_id,
        ticket_id=session.ticket_id,
        status=session.status,
        created_at=session.created_at,
    )
    return SessionWithTicket(session=session_read, ticket=ticket_read)


@router.get("/{session_id}/messages", response_model=list[MessageRead])
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    q = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return q.scalars().all()


@router.post("/{session_id}/messages", response_model=MessageRead, status_code=201)
async def send_message(
    session_id: str,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if not session or session.status == SessionStatus.closed:
        raise HTTPException(status_code=404, detail="Session not found or closed")

    # Update ticket status
    ticket_res = await db.execute(select(Ticket).where(Ticket.session_id == session_id))
    ticket = ticket_res.scalar_one_or_none()
    if ticket and ticket.status == TicketStatus.new:
        ticket.status = TicketStatus.in_progress_ai

    # Save user message (client may supply the id up front so it can edit/delete
    # this message before the AI response round-trip completes)
    user_msg = ChatMessage(
        id=payload.message_id or str(uuid.uuid4()),
        session_id=session_id,
        role=MessageRole.user,
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    # Link uploaded attachments to message
    if payload.attachment_ids:
        att_res = await db.execute(
            select(Attachment).where(
                Attachment.id.in_(payload.attachment_ids),
                Attachment.session_id == session_id,
            )
        )
        for att in att_res.scalars().all():
            att.message_id = user_msg.id

    # Fetch recent history for context
    hist_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = list(reversed(hist_res.scalars().all()))

    # Retrieve knowledge chunks
    chunks = await retrieve_chunks(payload.content)

    # Get extracted text from attachments
    attachment_text = ""
    if payload.attachment_ids:
        att_res = await db.execute(select(Attachment).where(Attachment.id.in_(payload.attachment_ids)))
        for att in att_res.scalars().all():
            if att.extracted_text:
                attachment_text += f"\n\n[Attachment: {att.filename}]\n{att.extracted_text}"

    # Call Azure OpenAI
    ai_response = await get_openai_response(
        question=payload.content,
        history=history,
        chunks=chunks,
        attachment_context=attachment_text,
    )

    # Save AI message
    ai_msg = ChatMessage(
        session_id=session_id,
        role=MessageRole.assistant,
        content=ai_response["content"],
        prompt_tokens=ai_response.get("prompt_tokens"),
        completion_tokens=ai_response.get("completion_tokens"),
    )
    db.add(ai_msg)
    await db.flush()

    # Save citations
    for chunk in chunks:
        citation = Citation(
            message_id=ai_msg.id,
            chunk_id=chunk.get("id", ""),
            source_title=chunk.get("source_title", ""),
            source_url=chunk.get("source_url"),
            content=chunk.get("content", ""),
            score=chunk.get("score"),
        )
        db.add(citation)

    await db.flush()

    q = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.id == ai_msg.id)
    )
    return q.scalar_one()


@router.put("/{session_id}/messages/{message_id}", response_model=MessageRead)
async def edit_message(
    session_id: str,
    message_id: str,
    payload: UpdateMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
    )
    msg = msg_res.scalar_one_or_none()
    if not msg or msg.role != MessageRole.user:
        raise HTTPException(status_code=404, detail="Message not found")

    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    msg.content = content
    await db.commit()

    q = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.citations), selectinload(ChatMessage.attachments))
        .where(ChatMessage.id == msg.id)
    )
    return q.scalar_one()


@router.delete("/{session_id}/messages/{message_id}", status_code=200)
async def delete_message(
    session_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
    )
    msg = msg_res.scalar_one_or_none()
    if not msg or msg.role != MessageRole.user:
        raise HTTPException(status_code=404, detail="Message not found")

    await db.delete(msg)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{session_id}/close", status_code=200)
async def close_session(
    session_id: str,
    payload: CloseSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.closed
    session.closed_at = datetime.now(timezone.utc)

    ticket_res = await db.execute(select(Ticket).where(Ticket.session_id == session_id))
    ticket = ticket_res.scalar_one_or_none()
    if ticket:
        if ticket.status == TicketStatus.in_progress_ai:
            ticket.status = TicketStatus.resolved_by_ai
        if ticket.status != TicketStatus.transferred_to_support:
            ticket.status = TicketStatus.closed

    # Save satisfaction feedback
    if payload.satisfaction_rating and ticket:
        feedback = SatisfactionFeedback(
            ticket_id=ticket.id,
            session_id=session_id,
            rating=payload.satisfaction_rating,
            comment=payload.comment,
        )
        db.add(feedback)

    # Generate conversation summary in background
    await db.flush()
    if ticket:
        await generate_summary(session_id=session_id, ticket_id=ticket.id, db=db)

    return {"status": "closed"}
