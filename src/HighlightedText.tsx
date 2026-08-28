import { Fragment } from 'react'
import { searchTerms } from './filtering'

interface HighlightedTextProps {
  text: string
  query: string
}

export default function HighlightedText({ text, query }: HighlightedTextProps) {
  const terms = searchTerms(query).filter((term) => Array.from(term).length > 2)
  if (!terms.length) return text
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'giu')
  return text.split(regex).map((part, index) =>
    terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>,
  )
}
