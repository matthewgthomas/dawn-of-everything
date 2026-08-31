import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HighlightedText from './HighlightedText'

describe('HighlightedText', () => {
  it('highlights an accented match for an unaccented query', () => {
    render(<p><HighlightedText text="The Chavín horizon" query="Chavin" /></p>)

    expect(screen.getByText('Chavín', { selector: 'mark' })).toBeInTheDocument()
  })
})
