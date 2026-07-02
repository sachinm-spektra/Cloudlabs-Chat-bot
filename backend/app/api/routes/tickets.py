from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...core.database import get_db
from ...models.user import User
from ...models.ticket import Ticket, TicketStatus
from ...schemas.ticket import TicketRead
from ..dependencies import get_current_user

router = APIRouter(prefix="/tickets", tags=["tickets"])


class RaiseTicketRequest(BaseModel):
    lab_name: str
    deployment_id: str

    @field_validator("lab_name", "deployment_id")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


@router.get("/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
    )
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return TicketRead(
        id=ticket.id,
        session_id=ticket.session_id,
        user_id=ticket.user_id,
        status=ticket.status,
        lab_name=ticket.lab_name,
        deployment_id=ticket.deployment_id,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.post("/{ticket_id}/raise", status_code=200)
async def raise_ticket(
    ticket_id: str,
    payload: RaiseTicketRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User explicitly raises ticket to human support when AI couldn't help."""
    res = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
    )
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.lab_name = payload.lab_name
    ticket.deployment_id = payload.deployment_id
    if ticket.status not in (TicketStatus.new, TicketStatus.in_progress_ai):
        await db.commit()
        return {"status": ticket.status, "message": "Ticket already raised"}
    ticket.status = TicketStatus.open
    await db.commit()
    return {"status": "raised", "message": "Your ticket has been raised. Support team will respond shortly."}


@router.post("/{ticket_id}/resolve", status_code=200)
async def mark_resolved(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
    )
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = TicketStatus.resolved_by_ai
    return {"status": "resolved"}
