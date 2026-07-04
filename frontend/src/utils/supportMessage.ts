const SUPPORT_PREFIX = /^\[Support(?::([^\]]+))?\]\s*/

export interface ParsedMessage {
  isSupport: boolean
  senderName: string
  content: string
}

export function parseSupportMessage(content: string): ParsedMessage {
  const match = content.match(SUPPORT_PREFIX)
  if (!match) {
    return { isSupport: false, senderName: '', content }
  }
  return {
    isSupport: true,
    senderName: match[1]?.trim() || 'Support',
    content: content.slice(match[0].length),
  }
}
