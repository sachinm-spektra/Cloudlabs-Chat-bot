import React from 'react'

type Token =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'code'; value: string }

function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = []
  const re = /\*\*(.+?)\*\*|\*([^*\n]+)\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|`([^`]+)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      tokens.push({ type: 'bold', value: match[1] })
    } else if (match[2] !== undefined) {
      tokens.push({ type: 'italic', value: match[2] })
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'link', text: match[3], href: match[4] })
    } else if (match[5] !== undefined) {
      tokens.push({ type: 'code', value: match[5] })
    }
    lastIndex = re.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

function renderTokens(tokens: Token[], dark: boolean): React.ReactNode[] {
  const linkClass = dark
    ? 'underline text-blue-300 hover:text-blue-200'
    : 'underline text-blue-600 hover:text-blue-800'
  const codeClass = dark
    ? 'bg-white/10 px-1 py-0.5 rounded text-xs font-mono'
    : 'bg-black/10 px-1 py-0.5 rounded text-xs font-mono'

  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return <strong key={i}>{token.value}</strong>
      case 'italic':
        return <em key={i}>{token.value}</em>
      case 'link':
        return (
          <a key={i} href={token.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {token.text}
          </a>
        )
      case 'code':
        return <code key={i} className={codeClass}>{token.value}</code>
      default:
        return <React.Fragment key={i}>{token.value}</React.Fragment>
    }
  })
}

export function renderMarkdown(text: string, dark = false): React.ReactNode {
  // Strip AI citation reference lines that look like: - [Context Reference](#4, #5)
  const lines = text
    .split('\n')
    .filter(line => !/^\s*-?\s*\[Context Reference/i.test(line.trim()))

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {renderTokens(tokenizeInline(line), dark)}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ))
}
