import { create } from 'zustand'
import type { Message, Session, Ticket } from '../types'

interface ChatState {
  session: Session | null
  ticket: Ticket | null
  messages: Message[]
  isLoading: boolean
  isStarting: boolean
  pendingAttachments: File[]
  uploadedAttachmentIds: string[]
  showSatisfaction: boolean
  setSession: (session: Session, ticket: Ticket) => void
  setTicket: (ticket: Ticket) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  updateMessageContent: (id: string, content: string) => void
  removeMessage: (id: string) => void
  setMessages: (messages: Message[]) => void
  setLoading: (loading: boolean) => void
  setStarting: (starting: boolean) => void
  addPendingAttachment: (file: File) => void
  removePendingAttachment: (index: number) => void
  clearPendingAttachments: () => void
  addUploadedId: (id: string) => void
  setShowSatisfaction: (show: boolean) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  session: null,
  ticket: null,
  messages: [],
  isLoading: false,
  isStarting: false,
  pendingAttachments: [],
  uploadedAttachmentIds: [],
  showSatisfaction: false,
  setSession: (session, ticket) => set({ session, ticket }),
  setTicket: (ticket) => set({ ticket }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content, is_streaming: false }
      }
      return { messages: msgs }
    }),
  updateMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),
  removeMessage: (id) =>
    set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),
  setMessages: (messages) => set({ messages }),
  setLoading: (isLoading) => set({ isLoading }),
  setStarting: (isStarting) => set({ isStarting }),
  addPendingAttachment: (file) =>
    set((state) => ({ pendingAttachments: [...state.pendingAttachments, file] })),
  removePendingAttachment: (index) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter((_, i) => i !== index),
    })),
  clearPendingAttachments: () => set({ pendingAttachments: [], uploadedAttachmentIds: [] }),
  addUploadedId: (id) =>
    set((state) => ({ uploadedAttachmentIds: [...state.uploadedAttachmentIds, id] })),
  setShowSatisfaction: (showSatisfaction) => set({ showSatisfaction }),
  clearChat: () =>
    set({
      session: null,
      ticket: null,
      messages: [],
      pendingAttachments: [],
      uploadedAttachmentIds: [],
      showSatisfaction: false,
    }),
}))
