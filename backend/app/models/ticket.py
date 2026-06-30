import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base
import enum


class TicketStatus(str, enum.Enum):
    new = "new"
    in_progress_ai = "in_progress_ai"
    resolved_by_ai = "resolved_by_ai"
    open = "open"                          # raised to L1 support by user
    transferred_to_support = "transferred_to_support"  # L1 support handling
    l2_escalated = "l2_escalated"          # escalated to L2 engineer
    owner_escalated = "owner_escalated"    # escalated to lab owner
    closed = "closed"


class Ticket(Base):
    __tablename__ = "ticket_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False, index=True, unique=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.new)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="ticket", foreign_keys=[session_id])
    user = relationship("User")
    transfers = relationship("TicketTransfer", back_populates="ticket", cascade="all, delete-orphan")
    summary = relationship("ConversationSummary", back_populates="ticket", uselist=False)
    feedback = relationship("SatisfactionFeedback", back_populates="ticket", uselist=False)


class TicketTransfer(Base):
    __tablename__ = "ticket_transfers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String, ForeignKey("ticket_cases.id"), nullable=False, index=True)
    transferred_by: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="transfers")


class SatisfactionFeedback(Base):
    __tablename__ = "satisfaction_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String, ForeignKey("ticket_cases.id"), nullable=False, unique=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="feedback")


class ConversationSummary(Base):
    __tablename__ = "conversation_summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String, ForeignKey("ticket_cases.id"), nullable=False, unique=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="summary")


class TokenUsageLog(Base):
    __tablename__ = "token_usage_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    model_deployment: Mapped[str] = mapped_column(String, nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
