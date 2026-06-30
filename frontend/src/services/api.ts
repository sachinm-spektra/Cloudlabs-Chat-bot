import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import type {
  AdminMetrics,
  ActivityItem,
  AuthTokens,
  BlobIngestResult,
  IngestionResult,
  KnowledgeBlob,
  Message,
  Session,
  Ticket,
  TokenUsagePoint,
  User,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_URL as string) || ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<User>('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post<AuthTokens>(
      '/auth/login',
      new URLSearchParams({ username: email, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),

  me: (token?: string) =>
    api.get<User>('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
}

export const ticketApi = {
  raise: (ticketId: string) =>
    api.post<{ status: string; message: string }>(`/tickets/${ticketId}/raise`),

  getById: (ticketId: string) =>
    api.get<Ticket>(`/tickets/${ticketId}`),
}

export const sessionApi = {
  create: () => api.post<{ session: Session; ticket: Ticket }>('/sessions'),

  getMessages: (sessionId: string) =>
    api.get<Message[]>(`/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: string, content: string, attachmentIds?: string[]) =>
    api.post<Message>(`/sessions/${sessionId}/messages`, {
      content,
      attachment_ids: attachmentIds ?? [],
    }),

  close: (sessionId: string, satisfactionRating?: number, comment?: string) =>
    api.post(`/sessions/${sessionId}/close`, {
      satisfaction_rating: satisfactionRating,
      comment,
    }),
}

export const fileApi = {
  upload: (sessionId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('session_id', sessionId)
    return api.post<{ id: string; filename: string; blob_url: string }>(
      '/files/upload',
      form
    )
  },
}

export const adminApi = {
  getMetrics: () => api.get<AdminMetrics>('/admin/metrics'),

  getTickets: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ tickets: Ticket[]; total: number }>('/admin/tickets', { params }),

  getTicket: (ticketId: string) =>
    api.get<Ticket>(`/admin/tickets/${ticketId}`),

  getSessions: (params?: { page?: number; limit?: number }) =>
    api.get<{ sessions: Session[]; total: number }>('/admin/sessions', { params }),

  getSessionMessages: (sessionId: string) =>
    api.get<Message[]>(`/admin/sessions/${sessionId}/messages`),

  transferTicket: (ticketId: string) =>
    api.post(`/admin/tickets/${ticketId}/transfer`),

  getActivity: () =>
    api.get<ActivityItem[]>('/admin/activity'),

  getTokenUsage: (days = 30) =>
    api.get<TokenUsagePoint[]>('/admin/token-usage', { params: { days } }),

  sendSessionMessage: (sessionId: string, content: string) =>
    api.post<Message>(`/admin/sessions/${sessionId}/messages`, { content }),

  getOpenTicketCount: () =>
    api.get<{ count: number }>('/admin/tickets/open-count'),

  escalateToL2: (ticketId: string) =>
    api.post(`/admin/tickets/${ticketId}/escalate-l2`),

  escalateToOwner: (ticketId: string) =>
    api.post(`/admin/tickets/${ticketId}/escalate-owner`),

  aiQuery: (question: string, sessionId?: string) =>
    api.post<{ content: string; citations: Array<{ source_title: string; source_url?: string }> }>(
      '/admin/ai-query',
      { question, session_id: sessionId }
    ),

  updateTicketStatus: (ticketId: string, status: string) =>
    api.put<{ status: string }>(`/admin/tickets/${ticketId}/status`, { status }),
}

export const knowledgeApi = {
  getConfigStatus: () =>
    api.get<{ storage_configured: boolean; search_configured: boolean; openai_configured: boolean; storage_container: string }>('/admin/knowledge/config-status'),

  listBlobs: () =>
    api.get<KnowledgeBlob[]>('/admin/knowledge/blobs'),

  ingestAll: () =>
    api.post<IngestionResult>('/admin/knowledge/ingest', {}),

  ingestBlob: (blobName: string) =>
    api.post<BlobIngestResult>('/admin/knowledge/ingest', { blob_name: blobName }),

  deleteBlob: (blobName: string) =>
    api.delete(`/admin/knowledge/blobs/${encodeURIComponent(blobName)}`),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ blob_name: string; size: number }>('/admin/knowledge/upload', form)
  },
}
