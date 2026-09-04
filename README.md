# The Dawn Atlas

An interactive atlas of 144 curated human settlements mentioned in David Graeber and David Wengrow's [*The Dawn of Everything*](https://dawnofeverything.industries/). The atlas connects each included place to its passages in the book and lets readers explore the collection by geography, occupation period, settlement type, and chapter.

[Open the atlas](https://matthewgthomas.github.io/dawn-of-everything/)

![The Dawn Atlas](public/og.png)

## The data

The dataset is a curated paragraph-level catalogue of places where people lived together, as described in the book's substantive text and notes. It contains 144 settlements, 613 settlement–paragraph mentions, and 296 bibliography entries linked through the book's notes.

The extraction process combined automated discovery with manual curation:

1. A copy of the e-book was divided into source paragraphs and labelled by chapter, notes section, and original line number. Front matter and back matter that did not form part of the substantive scope were excluded.
2. A high-recall candidate list was produced with spaCy named-entity recognition and rules for phrases such as “city of”, “village”, and “archaeological site”. This stage was intended to find a broad list of possible places rather than deciding what counted as a settlement.
3. Candidates were reviewed and consolidated in [`data/settlement_curation.csv`](data/settlement_curation.csv). This curation records canonical names, aliases used in the book, settlement types, occupation dates, selection hints, and notes. Countries, regions, rivers, cultures, fictional places, individual buildings, and unnamed settlements were excluded.
4. Candidate names were matched against Wikidata to obtain representative coordinates, descriptions, and external links. Ambiguous matches were reviewed, documented manual overrides were used where necessary, and three places remain unlocated because the evidence does not support a unique geographical point.
5. The build script matched every curated settlement and alias back to the source paragraphs, linked note citations to full bibliography entries, and generated the CSV and JSON files in [`data/derived`](data/derived).
6. A separate validator checked IDs, joins, coordinates, date ranges, citation links, intentional exclusions, source line ranges, and paragraph fidelity. The current dataset passes all 22 checks.

The app also includes [`data/research/settlement_areas.csv`](data/research/settlement_areas.csv), a source-backed companion dataset with 174 observations covering all 144 settlements. It records period-specific footprint estimates, explicit unknown results, uncertainty and area-basis metadata, citations, and contemporary scale comparators. Sixty-nine settlements currently have a defensible estimate; multi-phase sites retain their changes through time instead of being reduced to one timeless measurement.

Occupation dates are a reference synthesis for the dataset, not necessarily claims made in the passage where a place appears. Coordinates are representative points rather than settlement boundaries. For the full scope definition, table schemas, date conventions, provenance notes, and rebuild commands, see the [data methodology](data/README.md).

The source book text and temporary extraction/Wikidata files are excluded from the repository. They are not needed to run the app because the final derived dataset is committed.

## How the app works

The atlas is a static, client-side React application; it has no backend or database. At build time, [`src/data.ts`](src/data.ts) imports [`data/derived/dataset.json`](data/derived/dataset.json) and the settlement-area CSV, joins mention and area records to their settlements, converts numeric fields, and prepares searchable text and derived metadata.

The application keeps the current search, filters, selected settlement, and comparison list in React state. Full-text search covers names, aliases, settlement types, descriptions, chapters, and passage text. Results are ranked by relevance and explain why they matched; passage matches include a highlighted excerpt and open the settlement directly at the strongest matching passage. Name suggestions in the main search can also build a persistent settlement allow-list, while the Filters drawer provides a complete name-and-alias multi-select manager. Filters are organised around named settlements, book chapters, occupation-era presets, broad place categories, specific settlement types, and optional exact start/end dates. Search and filters update the result count, map, timeline, settlement-area view, and book-mentions view together, with each active filter shown as a removable chip.

On desktop, the map and a three-mode settlement panel form the main workspace. The panel switches between the unchanged occupation timeline, settlement areas ranked by their peak preferred estimates, and settlements ranked by book mentions. The Results button and a meaningful search switch this panel to book mentions rather than opening a separate drawer. New visitors also see a dismissible **Start exploring** card with shortcuts to a featured settlement, Chapter 8, and the earliest sites. A compact discovery panel beneath the map changes with the current selection and filters.

The world map uses D3's Equal Earth projection and Natural Earth-derived vector geometry. Its physical basemap includes major rivers and lakes, shaded mountain ranges, deserts, plateaus, basins, plains, tundra, and closer-zoom elevation features. Labels and river detail appear progressively as the reader zooms, and a layer menu independently controls water, landforms, and geographic names. Settlements chosen through the named allow-list receive adaptive marker labels: small visible sets are labelled immediately, while larger sets are labelled from closer zoom levels once clusters separate. The map automatically fits the currently visible, located settlements into the available viewport, using responsive padding on smaller screens. Nearby points are clustered according to zoom level; selecting a cluster zooms in, while selecting a place opens its record and recentres the map. The timeline plots known occupation intervals across BCE and CE dates, with a density overview, adjustable range, zoom controls, and presets from the earliest sites to later settlements. The area view uses a labelled logarithmic scale because the available estimates span nearly five orders of magnitude; hectares and square kilometres are presented to no more than three significant digits, with phases and comparators visible on every measured row. Settlements without defensible estimates remain available in a separate group.

Settlement details are split into **Overview**, **Area**, **Passages**, and **References** views. The overview leads with a representative book passage and a compact peak-area summary before location and curation metadata. The Area view retains every observation in curated order, including alternate estimates and explicit unknown findings, with comparator and research-source links. The Passages view groups paragraphs by book section and prioritises search matches. Settlements can be pinned from the list views, timeline, or detail view. The first pin prompts the reader to add another, and two to four places unlock a side-by-side comparison with chapter coverage, shared and unique chapters, linked-reference counts, and optional additional metadata.

On screens 900px wide and below, the Map and Explorer tabs switch between the map and the shared settlement panel. Timeline, settlement area, and book mentions remain available from the Explorer panel's inner selector, and a meaningful search switches the Explorer to Book mentions automatically. Drawers become near-full-width or full-screen where appropriate, while the map uses a more compact responsive layout. Search, filters—including the named-settlement allow-list—selection, and comparison are written to the URL, making a view shareable; settlement navigation also works with the browser Back button. Keyboard users can focus search with <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>, navigate settlement suggestions with the arrow keys, select one with <kbd>Enter</kbd>, and close suggestions or the active drawer with <kbd>Esc</kbd>. Dialogs trap focus while open and restore it to the invoking control when closed.

## Tech stack

- React 19 and TypeScript for the UI and application logic
- Vite 6 for local development and production builds
- D3 for map projection, paths, zooming, and panning
- TopoJSON, `world-atlas`, and bundled public-domain Natural Earth physical geography for basemaps
- Lucide React for interface icons and Fontsource for bundled web fonts
- Plain CSS for the responsive layout and visual design
- Vitest, jsdom, and Testing Library for unit and component tests
- Python, spaCy, regular expressions, and Wikidata SPARQL results for the data pipeline

## Run locally

You will need Node.js 18, 20, or 22+ and npm.

```sh
git clone https://github.com/matthewgthomas/dawn-of-everything.git
cd dawn-of-everything
npm ci
npm run dev
```

Open the local URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

The checked-in derived data is sufficient to run the app. To create and preview a production build:

```sh
npm run build
npm run preview
```

Run the test suite with:

```sh
npm test
```

## React components

| Component | Description |
| --- | --- |
| [`App`](src/App.tsx) | Owns shared state and composes the search band, active-filter chips, onboarding and discovery cards, map/timeline workspace, responsive tabs, drawers, browser history, URL synchronisation, and comparison workflow. |
| [`WorldMap`](src/WorldMap.tsx) | Projects located settlements onto an interactive Equal Earth map, automatically fits visible markers, clusters nearby points, and handles pan, zoom, reset, selection, and pinned-place labels. |
| [`SettlementViewsPanel`](src/SettlementViewsPanel.tsx) | Hosts the Timeline, Settlement area, and Book mentions modes and announces view changes accessibly. |
| [`SettlementAreaComparison`](src/SettlementAreaComparison.tsx) | Ranks filtered settlements by peak preferred area on a logarithmic scale while retaining unknown-area settlements. |
| [`Timeline`](src/Timeline.tsx) | Sorts and plots occupation intervals, provides timeline presets, a density overview, an adjustable time window and zoom controls, and supports selecting or pinning a place. |
| [`ResultsContent`](src/ResultsPanel.tsx) | Renders the Book mentions mode, including relevance explanations, highlighted passage excerpts, empty states, selection, and comparison pinning. |
| [`FilterPanel`](src/FilterPanel.tsx) | Provides chapter/section, occupation-era, broad place-category, specific type, and advanced BCE/CE date filters with a live result count. |
| [`DetailDrawer`](src/DetailDrawer.tsx) | Presents tabbed overview, area, passage, and reference views; groups paragraphs by book section; focuses search matches; and includes area, location, curation, and source metadata. |
| [`SettlementLocationMap`](src/SettlementLocationMap.tsx) | Renders the small world locator map used inside the settlement detail drawer. |
| [`CompareTray`](src/CompareTray.tsx) | Prompts for a second pin, then compares up to four settlements across core metadata, references, chapter coverage, and shared or unique chapters, with controls for reordering, removing, and clearing places. |
| [`AboutPanel`](src/AboutPanel.tsx) | Introduces the atlas, offers exploration shortcuts, and summarises the dataset's scope, caveats, methodology links, and project attribution. |
| [`BookTitleLink`](src/BookTitleLink.tsx) | Provides the consistently styled, reusable external link to the book's website used across the app shell and informational views. |

Supporting modules in [`src/data.ts`](src/data.ts), [`src/filtering.ts`](src/filtering.ts), [`src/mapClustering.ts`](src/mapClustering.ts), [`src/mapViewport.ts`](src/mapViewport.ts), [`src/HighlightedText.tsx`](src/HighlightedText.tsx), and [`src/useDialogFocus.ts`](src/useDialogFocus.ts) handle data normalisation, relevance ranking and URL serialisation, zoom-aware map clustering, responsive map fitting, accessible query highlighting, and dialog focus management respectively. [`src/main.tsx`](src/main.tsx) loads the fonts and global styles and mounts the app.

## License, rights and independence

The project code is available under the [MIT License](LICENSE).

This is an independent, unofficial atlas. It is not affiliated with, authorized by, or endorsed by David Graeber, David Wengrow, or Penguin Random House.

The book text, passages, notes, and bibliography are copyright © 2021 David Graeber and David Wengrow. All rights remain with the applicable rights holders. The project’s MIT License applies only to its original code; it does not license quoted book content or third-party data.

External links are provided for reference and do not imply endorsement. Dates, locations, descriptions, and other atlas metadata are a research synthesis, may be incomplete or contain errors, and should not be treated as authoritative scholarship.
