from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from ..models.chat import MessageRole, SessionStatus


class CitationRead(BaseModel):
    id: str
    chunk_id: str
    source_title: str
    source_url: Optional[str] = None
    content: str

    model_config = {"from_attributes": True}


class AttachmentRead(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    blob_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: str
    session_id: str
    role: MessageRole
    content: str
    citations: List[CitationRead] = []
    attachments: List[AttachmentRead] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionRead(BaseModel):
    id: str
    user_id: str
    ticket_id: Optional[str] = None
    status: SessionStatus
    created_at: datetime
    closed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
    attachment_ids: List[str] = []
    message_id: Optional[str] = None


class UpdateMessageRequest(BaseModel):
    content: str


class CloseSessionRequest(BaseModel):
    satisfaction_rating: Optional[int] = None
    comment: Optional[str] = None


class SessionWithTicket(BaseModel):
    session: SessionRead
    ticket: "TicketRead"

    model_config = {"from_attributes": True}


from .ticket import TicketRead
SessionWithTicket.model_rebuild()
