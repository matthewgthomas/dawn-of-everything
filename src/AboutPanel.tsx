import { useRef } from 'react'
import { ArrowUpRight, BookOpen, Clock3, MapPin, X } from 'lucide-react'
import { dataset } from './data'
import { useDialogFocus } from './useDialogFocus'

interface AboutPanelProps {
  onClose: () => void
  onExploreSettlement?: () => void
  onBrowseChapter?: () => void
  onExploreEarliest?: () => void
}

export default function AboutPanel({ onClose, onExploreSettlement, onBrowseChapter, onExploreEarliest }: AboutPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  useDialogFocus(panelRef)
  return (
    <aside ref={panelRef} className="about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div className="drawer-header">
        <div><h2 id="about-title">About the atlas</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close about panel"><X /></button>
      </div>
      <div className="about-content">
        <p className="about-lede">Explore the places in <em>The Dawn of Everything</em> by David Graeber and David Wengrow, then read the passages that connect each settlement to the book’s argument.</p>
        <div className="about-stats">
          <div><strong>{dataset.settlements.length}</strong><span>canonical settlements</span></div>
          <div><strong>{dataset.mentions.length}</strong><span>paragraph passages</span></div>
          <div><strong>{dataset.references.length}</strong><span>linked references</span></div>
        </div>

        <section className="about-start"><h3>Start exploring</h3><p>Search the full book text, browse a chapter, compare places, or trace occupation through time.</p>
          <div className="about-start-actions">
            {onExploreSettlement && <button onClick={onExploreSettlement}><MapPin /> Explore Teotihuacan</button>}
            {onBrowseChapter && <button onClick={onBrowseChapter}><BookOpen /> Browse Chapter 8</button>}
            {onExploreEarliest && <button onClick={onExploreEarliest}><Clock3 /> See earliest settlements</button>}
          </div>
        </section>

        <section><h3>What is included?</h3><p>Real, named places where people lived together: cities, towns, villages, inhabited archaeological sites, seasonal aggregation sites, cave habitations, forts, and historically attested capitals. Broad regions, countries, and unnamed settlements are excluded.</p></section>
        <section><h3>Method and caveats</h3><p>The catalogue is exhaustive at paragraph level across the substantive text and notes. Occupation dates summarise known periods of habitation rather than claiming continuous occupation, and may not be dates stated in the associated passage.</p><p>Coordinates are representative points, not settlement boundaries. Three records remain deliberately unlocated because the evidence does not support a unique physical point.</p></section>
        <div className="about-links">
          <a href="https://github.com/matthewgthomas/dawn-of-everything/blob/main/data/README.md" target="_blank" rel="noreferrer">Read the data methodology <ArrowUpRight /></a>
          <a href="https://github.com/matthewgthomas/dawn-of-everything/blob/main/data/derived/dataset.json" target="_blank" rel="noreferrer">View dataset.json <ArrowUpRight /></a>
        </div>
        <p className="attribution">Settlement text and metadata are presented for research and exploration purposes. This atlas is an independent project and is not affiliated with the book’s authors or publisher. The code is <a href="https://github.com/matthewgthomas/dawn-of-everything" target="_blank" rel="noreferrer">available on GitHub</a>.</p>
      </div>
    </aside>
  )
}
