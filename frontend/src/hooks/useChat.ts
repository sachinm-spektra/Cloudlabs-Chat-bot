import { useCallback, useEffect, useState } from 'react'
import { sessionApi, fileApi, ticketApi } from '../services/api'
import { useChatStore } from '../store/chatStore'
import type { TicketStatus } from '../types'

const HUMAN_STATUSES: TicketStatus[] = ['open', 'transferred_to_support', 'l2_escalated', 'owner_escalated']

export function useChat() {
  const {
    session,
    ticket,
    messages,
    isLoading,
    isStarting,
    pendingAttachments,
    setSession,
    setTicket,
    addMessage,
    setMessages,
    setLoading,
    setStarting,
    clearPendingAttachments,
    addUploadedId,
    uploadedAttachmentIds,
    setShowSatisfaction,
    clearChat,
    updateMessageContent,
    removeMessage,
  } = useChatStore()

  const [isRaising, setIsRaising] = useState(false)

  const startSession = useCallback(async () => {
    if (session) return
    setStarting(true)
    try {
      const { data } = await sessionApi.create()
      setSession(data.session, data.ticket)
      // Load the welcome message saved by the backend during session creation
      const { data: msgs } = await sessionApi.getMessages(data.session.id)
      setMessages(msgs)
    } finally {
      setStarting(false)
    }
  }, [session, setSession, setStarting, setMessages])

  useEffect(() => {
    startSession()
  }, [])

  // Poll for new messages when ticket is being handled by a human agent
  useEffect(() => {
    if (!session || !ticket) return
    if (!HUMAN_STATUSES.includes(ticket.status)) return

    const poll = async () => {
      try {
        const [{ data: msgs }, { data: refreshed }] = await Promise.all([
          sessionApi.getMessages(session.id),
          ticketApi.getById(ticket.id),
        ])
        setMessages(msgs)
        setTicket(refreshed)
      } catch {
        // ignore network errors silently
      }
    }

    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [session?.id, ticket?.status])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session || isLoading) return
      setLoading(true)

      const attachmentIds: string[] = [...uploadedAttachmentIds]

      for (const file of pendingAttachments) {
        try {
          const { data } = await fileApi.upload(session.id, file)
          attachmentIds.push(data.id)
          addUploadedId(data.id)
        } catch {
          // continue without this attachment
        }
      }
      clearPendingAttachments()

      const messageId = crypto.randomUUID()
      addMessage({
        id: messageId,
        session_id: session.id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      })

      try {
        const { data } = await sessionApi.sendMessage(session.id, content, attachmentIds, messageId)
        addMessage(data)
      } catch {
        addMessage({
          id: `err-${Date.now()}`,
          session_id: session.id,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    },
    [session, isLoading, pendingAttachments, uploadedAttachmentIds, setLoading, clearPendingAttachments, addMessage, addUploadedId]
  )

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!session) return
      const { data } = await sessionApi.updateMessage(session.id, messageId, content)
      updateMessageContent(messageId, data.content)
    },
    [session, updateMessageContent]
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!session) return
      await sessionApi.deleteMessage(session.id, messageId)
      removeMessage(messageId)
    },
    [session, removeMessage]
  )

  const closeSession = useCallback(
    async (rating?: number, comment?: string) => {
      if (!session) return
      await sessionApi.close(session.id, rating, comment)
      setShowSatisfaction(false)
      clearChat()
    },
    [session, setShowSatisfaction, clearChat]
  )

  const loadHistory = useCallback(async () => {
    if (!session) return
    const { data } = await sessionApi.getMessages(session.id)
    setMessages(data)
  }, [session, setMessages])

  const raiseTicket = useCallback(async (labName: string, deploymentId: string) => {
    if (!ticket || isRaising) return
    setIsRaising(true)
    try {
      await ticketApi.raise(ticket.id, labName, deploymentId)
      const { data: refreshed } = await ticketApi.getById(ticket.id)
      setTicket(refreshed)
    } catch {
      // ignore — ticket remains in current state
    } finally {
      setIsRaising(false)
    }
  }, [ticket, isRaising, setTicket])

  return {
    session,
    ticket,
    messages,
    isLoading,
    isStarting,
    sendMessage,
    closeSession,
    loadHistory,
    startSession,
    raiseTicket,
    isRaising,
    editMessage,
    deleteMessage,
  }
}
