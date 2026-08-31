import { Fragment } from 'react'
import { normalizeSearchText, searchTerms } from './filtering'

interface HighlightedTextProps {
  text: string
  query: string
}

export default function HighlightedText({ text, query }: HighlightedTextProps) {
  const terms = searchTerms(query).filter((term) => Array.from(term).length > 2)
  if (!terms.length) return text

  let originalOffset = 0
  const normalizedParts: string[] = []
  const originalOffsets: number[] = []
  Array.from(text).forEach((point) => {
    const normalizedPoint = normalizeSearchText(point)
    normalizedParts.push(normalizedPoint)
    originalOffsets.push(...Array.from({ length: normalizedPoint.length }, () => originalOffset))
    originalOffset += point.length
  })
  const normalizedText = normalizedParts.join('')
  const ranges = terms.flatMap((term) => {
    const matches: Array<[number, number]> = []
    let index = 0
    while ((index = normalizedText.indexOf(term, index)) >= 0) {
      const start = originalOffsets[index]
      const finalPointStart = originalOffsets[index + term.length - 1]
      const finalPoint = Array.from(text.slice(finalPointStart))[0] ?? ''
      matches.push([start, finalPointStart + finalPoint.length])
      index += Math.max(1, term.length)
    }
    return matches
  }).sort((a, b) => a[0] - b[0] || b[1] - a[1])

  const merged = ranges.reduce<Array<[number, number]>>((result, range) => {
    const previous = result.at(-1)
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1])
    else result.push([...range])
    return result
  }, [])
  if (!merged.length) return text

  const fragments: React.ReactNode[] = []
  let cursor = 0
  merged.forEach(([start, end], index) => {
    if (start > cursor) fragments.push(<Fragment key={`text-${index}`}>{text.slice(cursor, start)}</Fragment>)
    fragments.push(<mark key={`match-${index}`}>{text.slice(start, end)}</mark>)
    cursor = end
  })
  if (cursor < text.length) fragments.push(<Fragment key="text-end">{text.slice(cursor)}</Fragment>)
  return fragments
}
