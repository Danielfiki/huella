import React from 'react'

export function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  )
}

export function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.trim() === '') return <br key={i} />
    if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,3} /)) {
      const content = line.replace(/^#{1,3} /, '').replace(/^\*\*|\*\*$/g, '')
      return <strong key={i} style={{ display: 'block' }}>{content}</strong>
    }
    if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
      return <li key={i}>{renderInline(line.replace(/^([-*]|\d+\.)\s+/, ''))}</li>
    }
    return <p key={i} style={{ margin: 0 }}>{renderInline(line)}</p>
  })
}
