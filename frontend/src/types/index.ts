export type UserRole = 'user' | 'admin'

export type TicketStatus =
  | 'new'
  | 'in_progress_ai'
  | 'resolved_by_ai'
  | 'open'
  | 'transferred_to_support'
  | 'l2_escalated'
  | 'owner_escalated'
  | 'closed'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
}

export interface Session {
  id: string
  user_id: string
  ticket_id: string
  status: 'active' | 'closed'
  created_at: string
  closed_at?: string
}

export interface Citation {
  id: string
  chunk_id: string
  source_title: string
  source_url?: string
  content: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  attachments?: Attachment[]
  created_at: string
  is_streaming?: boolean
}

export interface Attachment {
  id: string
  message_id?: string
  session_id: string
  filename: string
  content_type: string
  size: number
  blob_url: string
  created_at: string
}

export interface Ticket {
  id: string
  session_id: string
  user_id: string
  user_name?: string
  user_email?: string
  status: TicketStatus
  created_at: string
  updated_at: string
  summary?: string
  message_count?: number
  last_message?: string
}

export interface SatisfactionFeedback {
  id: string
  session_id: string
  rating: number
  comment?: string
  created_at: string
}

export interface AdminMetrics {
  total_sessions: number
  active_sessions: number
  tickets_resolved_by_ai: number
  open_tickets: number
  transferred_tickets: number
  resolution_rate: number
  avg_satisfaction: number
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  knowledge_articles: number
  search_success_rate: number
  connected_sources: number
  resolved_queries: number
}

export interface ActivityItem {
  id: string
  user_name: string
  user_initials: string
  action: string
  detail: string
  timestamp: string
}

export interface TokenUsagePoint {
  date: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface KnowledgeBlob {
  blob_name: string
  size: number
  last_modified: string | null
  chunks: number
  indexed: boolean
}

export interface IngestionResult {
  total_files: number
  indexed_files: number
  total_chunks: number
  errors: string[]
}

export interface BlobIngestResult {
  blob_name: string
  chunks: number
  error: string | null
}
