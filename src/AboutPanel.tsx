import { ArrowUpRight, CheckCircle2, X } from 'lucide-react'
import { dataset } from './data'

interface AboutPanelProps { onClose: () => void }

export default function AboutPanel({ onClose }: AboutPanelProps) {
  return (
    <aside className="about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div className="drawer-header">
        <div>
          {/* <p className="eyebrow">Methods & provenance</p> */}
          <h2 id="about-title">About the data</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close about panel"><X /></button>
      </div>
      <div className="about-content">
        <p className="about-lede">An exhaustive, paragraph-level catalogue of human settlements named in the substantive text and notes of <em>The Dawn of Everything</em>.</p>
        <div className="about-stats">
          <div><strong>174</strong><span>canonical settlements</span></div>
          <div><strong>668</strong><span>paragraph mentions</span></div>
          <div><strong>295</strong><span>linked references</span></div>
        </div>
        <section><h3>What counts as a settlement?</h3><p>A real, named place where people lived together: cities, towns, villages, inhabited archaeological sites, seasonal aggregation sites, cave habitations, forts and historically attested capitals. Broad regions, countries and unnamed settlements are excluded.</p></section>
        <section><h3>Reading the dates</h3><p>Occupation dates summarise known periods of habitation rather than claiming continuous occupation. They are a reference synthesis for this dataset and are not necessarily dates stated in the cited book passage.</p></section>
        <section><h3>Reading the map</h3><p>Coordinates are representative points, not settlement boundaries. Three records remain deliberately unlocated because the evidence does not support a unique physical point.</p></section>
        <div className="about-links">
          <a href="https://github.com/matthewgthomas/dawn-of-everything/blob/main/data/README.md" target="_blank" rel="noreferrer">Read the data methodology <ArrowUpRight /></a>
          <a href="https://github.com/matthewgthomas/dawn-of-everything/blob/main/data/derived/dataset.json" target="_blank" rel="noreferrer">View dataset.json <ArrowUpRight /></a>
        </div>
        <p className="attribution">Settlement text and metadata are presented for research and exploration purposes. This atlas is an independent project and is not affiliated with the book’s authors or publisher. The code is <a href="https://github.com/matthewgthomas/dawn-of-everything" target="_blank" rel="noreferrer">available on GitHub</a>.</p>
      </div>
    </aside>
  )
}
