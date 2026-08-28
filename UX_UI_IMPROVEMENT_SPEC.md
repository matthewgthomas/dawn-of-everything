# The Dawn Atlas: UX/UI Improvement Specification

**Status:** Proposed  
**Audience:** Product designer and software engineer  
**Primary implementation:** React, TypeScript, D3, and CSS  
**Scope:** Desktop and mobile atlas experience

## 1. Summary

The Dawn Atlas has a distinctive visual identity and a valuable underlying dataset: 174 settlements connected to 668 paragraph-level mentions in *The Dawn of Everything*. The redesign should make those connections to the book more visible and easier to explore.

The principal structural change is to remove the permanently visible results column from the default desktop layout. The map and timeline should become the primary workspace, while settlement results remain available through a contextual drawer and the existing mobile Results tab. Search results must then earn their place by explaining *why* each settlement matched, particularly when the query matches book passages.

The work covers eight product changes:

1. Replace the persistent desktop results column with contextual results.
2. Make search results explain their relevance.
3. Bring book passages forward in settlement details.
4. Improve first-visit orientation.
5. Simplify filters around reader-friendly concepts.
6. Make the timeline easier to understand and navigate.
7. Improve the mobile map and mobile search/filter presentation.
8. Make comparison useful only when there is something to compare.

The redesign must preserve the current book-cover-inspired palette, editorial typography, URL shareability, keyboard access, reduced-motion support, and the ability to browse every settlement.

## 2. Goals

- Make the book passages feel like the core content rather than a secondary data field.
- Give the map and timeline substantially more room on desktop.
- Help a first-time visitor understand the atlas and take a meaningful action within seconds.
- Make full-text search transparent: users should be able to see why a result matched before opening it.
- Replace specialist filtering controls with concepts a general reader can understand.
- Improve mobile use without removing the Results, Map, and Timeline views.
- Preserve the visual character of the current site while establishing a clearer hierarchy.
- Make selection, closing, browser Back, focus restoration, and deep links behave predictably.

## 3. Non-goals

- Do not change the settlement inclusion criteria or the underlying research methodology.
- Do not add a backend, account system, saved collections, or user-generated content.
- Do not replace the D3 map or timeline implementation unless a requirement cannot be met incrementally.
- Do not remove the full settlement list; change where and when it is presented.
- Do not replace the current visual identity with a generic dashboard aesthetic.
- Do not introduce non-linear time scaling that would make occupation durations visually misleading.

## 4. Target experience

### 4.1 Desktop, 1051px and wider

The default screen consists of:

1. A compact site header.
2. A search and filter band.
3. A two-column exploration workspace:
   - Map: approximately 60–65% of the available width.
   - Timeline: approximately 35–40% of the available width.
4. No permanently visible settlement list.

The search band contains:

- The search field.
- A Filters button with an active-filter count.
- A Results button such as **174 settlements**, with a list icon.

The Results button opens a drawer from the left. Selecting a settlement closes the results drawer and opens settlement details from the right. Only one large drawer should be open at a time.

### 4.2 Tablet and mobile, 900px and narrower

Retain the existing **Results / Map / Timeline** tabs. The three views should remain mutually exclusive and use the available viewport.

When a user starts a meaningful search on mobile, switch to the Results tab automatically. Do not switch on the first character; switch when the trimmed query contains at least two characters. Clearing the query should not unexpectedly switch the user back to another tab.

### 4.3 Shared interaction model

- Search and filters update the map, timeline, result count, and results list together.
- A selected settlement is represented consistently across the map, timeline, results, detail view, and URL.
- Closing settlement details clears the active detail selection unless the product intentionally displays a persistent selected state elsewhere.
- Opening a settlement should add a navigable history entry. Browser Back should close the current settlement detail or return to the previous settlement/filter state.
- Search/filter keystrokes may update the current URL using `replaceState`; discrete navigation such as opening a settlement should use `pushState`.
- Closing any drawer restores focus to the control that opened it.
- Drawers must trap keyboard focus while open and close with Escape.

## 5. Functional requirements

### Change 1: Replace the persistent desktop results column

#### Problem

The current 320px desktop results panel duplicates settlements already selectable on the map and timeline. In its default state it offers no additional context beyond name, type, dates, and mention count, while reducing the space available for both visualizations.

#### Requirements

1. Remove `.results-panel` from the default desktop grid at widths of 1051px and above.
2. Change the desktop workspace to a two-column map/timeline grid.
3. Convert the current result total into an interactive Results button.
4. The Results button label must reflect current state:
   - No active search or filters: **174 settlements**.
   - Active search or filters: **25 results**, using the actual count.
5. Open the desktop results view as a left-side drawer approximately 400–460px wide, capped at 96vw.
6. The drawer must support the complete list, empty state, settlement selection, and comparison pinning.
7. Do not automatically open the drawer merely because a filter checkbox changes. The updated Results button count is sufficient feedback.
8. When a text query reaches two trimmed characters on desktop, open the results drawer if it is not already open. Once the user manually closes it, do not reopen it again for every subsequent keystroke in the same focused search session.
9. Selecting a result closes the results drawer and opens settlement details.
10. Retain the existing Results tab on tablet and mobile.

#### Acceptance criteria

- At 1280 × 720, neither map nor timeline is obscured by a persistent results column.
- The map receives at least 55% of the workspace width at supported desktop sizes.
- Every settlement remains reachable without using the map or timeline.
- Keyboard users can open the results drawer, traverse results, select a settlement, close the drawer, and return focus to the Results button.
- The empty-results state offers a working **Reset all** action.

### Change 2: Make search results explain their relevance

#### Problem

A thematic query such as “women” currently returns settlements without showing which passage matched. Cards continue to emphasize total mention volume, making a correct result appear arbitrary.

#### Requirements

1. For every search result, derive and expose:
   - Match source: canonical name, alias, settlement type, chapter/section, description, or passage text.
   - Number of matching passages.
   - Best matching passage, if one exists.
   - Section/chapter containing that passage.
2. When a query is present, label the drawer **Search results** and show **Sorted by relevance** rather than **Ranked by mentions**.
3. Query result cards should display:
   - Settlement name.
   - Settlement type and occupation interval.
   - A match explanation, for example **3 matching passages in Chapters 8 and 10**.
   - A two- or three-line excerpt from the best matching passage with query terms highlighted.
   - Total mentions only as secondary information.
4. If the match comes from the name, alias, type, section, or description and no passage contains the query, show a concise explanation such as **Name match** or **Mentioned in Chapter 8** instead of an empty excerpt.
5. Search ordering must use a stable relevance model:
   1. Exact canonical-name match.
   2. Canonical-name prefix.
   3. Canonical-name substring.
   4. Alias match.
   5. Type or section match.
   6. Description match.
   7. Passage-text match.
   8. Within an equal tier: number/quality of query matches, then total mentions, then alphabetical name.
6. Excerpt generation must center the first or strongest match, preserve whole words where practical, and avoid beginning or ending with partial HTML entities or broken Unicode characters.
7. Selecting a result with passage matches opens the detail view at the Passages section and focuses the best matching passage.
8. All query terms longer than two characters should be highlighted in the detail passages.
9. Results must continue to update through the existing deferred-query mechanism without visible typing lag.

#### Suggested data shape

```ts
interface SettlementSearchResult {
  settlement: NormalizedSettlement
  matchSource: 'name' | 'alias' | 'type' | 'section' | 'description' | 'passage'
  matchingMentions: Mention[]
  bestMention: Mention | null
  rank: number
}
```

The search-result derivation should live outside the presentation component and have unit tests for ranking, multiple terms, aliases, Unicode names, and passage excerpts.

#### Acceptance criteria

- Searching for a term found only in passage text shows at least one highlighted passage excerpt in the result drawer.
- A user can identify why every displayed result matched without opening it.
- Exact place-name searches rank that settlement first.
- Opening a passage-matched result makes a highlighted matching passage visible without manually scrolling through metadata.
- No-query browsing continues to use total mentions as the default ranking.

### Change 3: Bring book passages forward in settlement details

#### Problem

The current detail drawer leads with a locator map, coordinates, occupation provenance, and curation metadata. The book passages—the atlas’s main differentiator—begin below the first viewport.

#### Requirements

1. Keep the current hero with name, occupation interval, close control, and comparison action.
2. Add a sticky internal navigation immediately below the hero:
   - **Overview**
   - **Passages (N)**
   - **References**, when references exist
3. The Overview view should contain, in this order:
   - One-sentence place description.
   - A featured passage card from the first substantive chapter mention, excluding front matter and notes when possible.
   - A compact **Appears in** summary.
   - Locator map.
   - Core metadata.
   - Curation/location notes.
4. When arriving from a passage-text search:
   - Open the Passages view by default.
   - Show **N matching passages** above the list.
   - Place matching passages before non-matching passages, while preserving book order within each group.
   - Scroll/focus the best matching passage.
5. When arriving from a name, alias, type, or map selection, open Overview by default.
6. Group passages by book section. For settlements with many mentions, groups should be collapsible; open the first substantive group and any group containing a search match.
7. Retain notes and bibliography alongside their associated passage, but also provide an aggregated References view if it can be implemented without duplicating inconsistent data.
8. External Wikipedia and Wikidata links remain secondary and should not precede book content.

#### Acceptance criteria

- At 1280 × 720, the first detail viewport contains either a featured book passage or a query-matching passage.
- Teotihuacan’s 54 passages are navigable by section without requiring a single undifferentiated long scroll.
- A user can switch among Overview, Passages, and References without losing the selected settlement.
- Search highlights remain visible and accessible; highlighted text must not be conveyed by color alone.

### Change 4: Improve first-visit orientation

#### Problem

The header identifies the dataset but does not clearly communicate the experience. The existing About panel begins with methodology, and the map instruction explains mechanics without giving the reader an inviting starting point.

#### Requirements

1. Replace the header subtitle with a concise value proposition. Recommended copy:

   > Explore 174 settlements and the passages that connect them to *The Dawn of Everything*.

2. Rename **About this data** to **About the atlas**.
3. The About panel should lead with:
   - What the visitor can do.
   - The settlement, passage, and reference counts.
   - What is included.
   - Methodology, date, and coordinate caveats.
4. Replace the current map instruction with a compact **Start exploring** card when no query, filters, selection, or comparison is active.
5. The start card should offer three actions:
   - **Explore Teotihuacan**: selects and opens that settlement.
   - **Browse Chapter 8**: applies the corresponding chapter filter.
   - **See earliest settlements**: applies the earliest timeline preset and brings the timeline into view on mobile.
6. The start card may be dismissed for the current browser using local storage, but it must remain available through About the atlas or a help control.
7. Do not introduce a forced welcome modal.

#### Acceptance criteria

- A first-time visitor can determine that the site connects settlements to book passages without opening About.
- Every start-card action produces a visible, reversible state change.
- The start card does not cover map controls or important markers at common desktop sizes.
- Dismissing onboarding does not affect shareable filter or settlement URLs.

### Change 5: Simplify filters around reader-friendly concepts

#### Problem

The current filter panel begins with dozens of highly specific settlement types, many with only one record. Chapter selection—the most book-oriented filter—appears after complex start/end date controls.

#### Requirements

1. Reorder the filter panel:
   1. Book chapters and sections.
   2. Era.
   3. Place category.
   4. Advanced occupation dates.
2. Present main chapters before front matter and notes. Notes may be grouped under an expandable **Notes and front matter** subsection.
3. Add era presets based on occupation overlap, not only start/end values:
   - **Earliest sites:** before 10,000 BCE.
   - **Early settled life:** 10,000–4,000 BCE.
   - **First cities:** 4,000–1,000 BCE.
   - **Ancient and classical:** 1,000 BCE–500 CE.
   - **Later settlements:** 500 CE–present.
4. Selecting an era includes a settlement when any known part of its occupation interval overlaps that era. Records with unknown intervals must be handled by a separately labelled option.
5. Introduce a small set of broad place categories backed by an explicit data-layer mapping:
   - Cities and urban centres.
   - Towns and villages.
   - Seasonal and aggregation sites.
   - Ceremonial and monument sites.
   - Caves and open-air sites.
   - Fortified, capital, and trading centres.
   - Other or unresolved.
6. Every existing settlement type must map to at least one category, and the mapping must be covered by a validation test.
7. Preserve detailed settlement types as an expandable **Specific types** advanced control.
8. Keep exact start/end year controls under **Advanced occupation dates**.
9. The sticky footer action should read **View N settlements**, using the live result count.
10. Applied filters remain visible as removable chips outside the drawer.

#### Acceptance criteria

- Chapter and era filters are visible without scrolling when the filter drawer opens at 1280 × 720.
- A user can select a broad era without entering BCE/CE values manually.
- Applying a broad place category never produces a result outside its tested mapping.
- Existing shared URLs using detailed `types`, `startFrom`, `startTo`, `endFrom`, and `endTo` parameters continue to work.
- Reset filters preserves the text query, matching current behavior.

### Change 6: Make the timeline easier to understand and navigate

#### Problem

The complete 40,800 BCE–present scale compresses most settlement durations. The current plus, minus, reset, density display, and dual range inputs are functional but require experimentation.

#### Requirements

1. Add visible preset controls above or immediately below the timeline overview:
   - **All time**
   - **Earliest**
   - **10,000 BCE–present**
   - **4,000 BCE–500 CE**
   - **500 CE–present**
2. Use **10,000 BCE–present** as the initial visible window, while retaining access to all earlier records through **Earliest** and **All time**.
3. Show a concise notice when matching settlements fall outside the current window, for example **6 earlier settlements outside this view · Show all**.
4. Keep the overview histogram and range handles, but give the handles a visible selected range and clear hover/focus treatment.
5. Add tooltips or visible labels for zoom in, zoom out, and reset. Icon-only controls must retain accessible names.
6. Selecting a settlement outside the current window should continue to move the window to include it, but the transition should explain the change with a short status message such as **Timeline moved to Teotihuacan**.
7. Do not use logarithmic or otherwise distorted time scales.
8. On mobile, presets may use a horizontally scrollable chip row. The timeline rows must remain vertically scrollable.

#### Acceptance criteria

- The initial timeline makes Neolithic, Bronze Age, classical, and later settlement durations visibly distinguishable.
- All settlements remain reachable in All time or through selection.
- Presets, range handles, zoom controls, and settlement rows are usable by keyboard.
- The selected visible range is announced to assistive technology after it changes.

### Change 7: Improve the mobile map and mobile controls

#### Problem

In portrait view, the world projection occupies the top of a tall map container and leaves a large unused mustard area. The zero-count filter badge also appears visually detached from its icon, and the large header reduces the exploration area.

#### Requirements

1. Give the mobile map a bounded responsive aspect ratio rather than stretching its shell to the full remaining viewport. Target approximately 1.45–1.65 width-to-height depending on breakpoint.
2. Center and scale the world projection within the map bounds. Do not leave a large empty region below the projection.
3. Use the space below the map for a compact discovery sheet:
   - No selection: result count, interaction hint, and up to three suggested settlements.
   - Active filters/search: result count and a **View results** action.
   - Selected marker: settlement name, type, era, and **Open details** action.
4. Keep the Results, Map, and Timeline tabs visible and sticky.
5. Reduce the mobile header to approximately 72–80px where the logo remains legible.
6. Present About the atlas as a compact labelled icon or menu action on narrow screens.
7. Hide the filter-count badge when the count is zero. When non-zero, render it as a visually attached badge with a minimum 20px touch-safe target around the parent button.
8. Search must remain visible above the tabs. On a query of at least two characters, switch to Results as described in section 4.2.
9. All touch targets must be at least 44 × 44 CSS pixels unless they form part of a larger labelled row.

#### Acceptance criteria

- At 390 × 844, the map projection is vertically balanced and no large unused map-colored region remains.
- The discovery sheet does not duplicate the entire Results list.
- The filter control shows no detached “0” badge.
- Header, search, tabs, map, and at least part of the discovery sheet are visible without scrolling on a fresh visit.
- Map controls do not overlap clusters, onboarding, or the discovery sheet.

### Change 8: Make comparison useful only with two or more settlements

#### Problem

The comparison launcher appears after one settlement is pinned and allows the user to open a mostly empty one-column comparison table. Several prominent comparison fields, such as raw coordinates and aliases, are less useful to a general reader than chapter and passage relationships.

#### Requirements

1. After the first pin, show a collapsed launcher reading **1 of 4 selected · Add one more to compare**.
2. Do not open the full comparison view until at least two settlements are pinned.
3. The one-item launcher must provide a way to remove or clear the current pin without opening the full comparison.
4. With two to four settlements, label the launcher **Compare N settlements**.
5. Prioritize comparison rows in this order:
   - Place type.
   - Occupation interval and known span.
   - Total book mentions.
   - Sections/chapters mentioned.
   - Chapter coverage matrix.
   - Shared and unique chapters, where derivable.
   - References.
6. De-emphasize aliases and raw coordinates. They may remain in an expandable **Additional metadata** section.
7. Retain the current four-settlement limit, labels A–D, reordering, removal, clearing, map markers, timeline markers, and URL persistence.
8. When the fourth item has been pinned, disabled pin controls must explain the limit through visible or accessible text.

#### Acceptance criteria

- A one-item comparison table cannot be opened accidentally.
- The interface clearly explains how to add the second settlement.
- Two settlements can be compared without horizontal scrolling at 1280px where possible; three and four may use horizontal scrolling.
- Comparison remains usable as a full-screen view on mobile.
- Removing items updates labels, map/timeline marker styling, and the URL consistently.

## 6. Visual design refinements

### 6.1 Preserve

- Mustard, cream, red, and oxblood palette.
- Editorial display typography and book-cover reference.
- Square, print-like geometry.
- High-contrast active states.
- Existing focus-visible and reduced-motion principles.

### 6.2 Refine

1. **Header height:** Reduce the desktop header from 132px to approximately 96–104px and mobile to approximately 72–80px. The title should remain the dominant brand element without consuming nearly one fifth of a 720px-tall viewport.
2. **Hierarchy:** Reserve solid red backgrounds for active tabs, selected settlements, and primary actions. Avoid using the same visual weight for every boundary and control.
3. **Borders:** Use 2px oxblood/red rules for major regions and 1px neutral rules for internal rows. Remove redundant nested borders where adjacent sections already create separation.
4. **Typography:** Keep condensed uppercase text for section labels and display headings. Use mixed-case body/UI text for instructions, filter labels, excerpts, and helper copy. Avoid all-caps text below 12px.
5. **Readable sizing:** Target at least 14px for UI labels and 16px with a comfortable line height for passage text. Passage excerpts should remain easy to read at drawer widths.
6. **Spacing:** Increase separation between conceptual groups while reducing decorative padding inside repeated rows. The interface should feel editorial, not cramped.
7. **Controls:** Add text labels or tooltips where icons are not self-explanatory. Do not rely on the star icon alone to teach comparison.
8. **State consistency:** Use the same selected and pinned colors/letters across results, map, timeline, details, and comparison.
9. **Contrast:** Verify all text, focus rings, disabled controls, highlighted query terms, and map markers against WCAG 2.2 AA contrast requirements where applicable.
10. **Motion:** Drawer and selection transitions should be brief and respect `prefers-reduced-motion`.

## 7. Responsive behavior matrix

| Feature | Desktop ≥1051px | Tablet 601–900px | Mobile ≤600px |
| --- | --- | --- | --- |
| Results | Left drawer | Results tab | Results tab |
| Map/timeline | Simultaneous 60/40 workspace | Exclusive tabs | Exclusive tabs |
| Search response | Opens results drawer once per search session | Switches to Results at 2+ characters | Switches to Results at 2+ characters |
| Filters | Right drawer | Full-width/right drawer | Full-screen drawer |
| Details | Right drawer, max ~600px | Near-full-width drawer | Full-screen drawer |
| Comparison | Bottom launcher/full overlay | Bottom launcher/full overlay | Bottom launcher/full-screen overlay |
| Map support content | Start card overlay | Discovery sheet below map | Discovery sheet below map |

## 8. Accessibility and interaction requirements

- Maintain semantic headings, landmarks, labelled navigation, and dialog names.
- Results drawer, filters, details, About, and comparison must trap focus and restore it on close.
- Escape closes only the topmost open surface.
- Browser Back closes or reverses the most recent discrete navigation state.
- Search result excerpts must expose highlighted terms to screen readers without repeating them unnecessarily.
- Timeline range changes and result-count changes should use concise polite live-region announcements.
- Collapsible chapter groups must expose `aria-expanded` and an accessible name containing the chapter and passage count.
- Map markers and clusters must retain accessible names and keyboard activation.
- No interaction may require hover alone.
- Verify touch targets and zoom behavior at 200% browser zoom.

## 9. State and URL requirements

Continue to serialize search, filters, selected settlement, and comparison IDs. Add new parameters only where the state must be shareable.

Recommended behavior:

- Search/filter edits: debounced `replaceState`.
- Open settlement: `pushState` with `settlement`.
- Close settlement: `history.back()` when the current entry was created by settlement navigation; otherwise replace the URL without `settlement`.
- Comparison membership: keep the current `compare` parameter.
- Results/filter/detail drawer visibility: local UI state, not serialized.
- Detail tab: serialize only if a shared link needs to open Passages or References; otherwise derive the initial tab from the match source.
- New broad category/era filters must coexist with existing detailed-type/date URLs. Do not silently change the meaning of old parameters.

## 10. Testing requirements

### Unit tests

- Search match-source classification and ordering.
- Multi-term passage matching and excerpt generation.
- Broad type-to-category mapping coverage.
- Era-overlap logic, including unknown starts/ends.
- URL parsing and serialization, including backward compatibility.
- Comparison states at zero, one, two, and four pins.

### Component tests

- Results drawer open/close and focus restoration.
- Search automatically opens/switches to Results only at the defined threshold.
- Query result opens the correct matching passage.
- Detail internal navigation and collapsible chapter groups.
- Timeline presets and out-of-view notice.
- One pinned settlement cannot open full comparison.
- Filter badge is hidden at zero and correct above zero.

### Visual and interaction QA

Test at minimum:

- 1280 × 720 desktop.
- 1440 × 900 desktop.
- 768 × 1024 tablet.
- 390 × 844 mobile.
- 320 × 568 small mobile.
- Keyboard-only navigation.
- 200% browser zoom.
- Reduced motion.
- Empty search results.
- A high-volume settlement such as Teotihuacan.
- An unresolved location.
- A passage-only thematic query such as “women”.

## 11. Suggested implementation sequence

### Phase 1: Structural changes

1. Introduce the new search-result data model and tests.
2. Build the desktop results drawer using the existing result-card behavior.
3. Remove the desktop results column and resize the map/timeline workspace.
4. Correct settlement selection, close, browser history, and focus behavior.

### Phase 2: Reader-first content

1. Add contextual excerpts and relevance labels to results.
2. Reorder the detail drawer and add Overview/Passages navigation.
3. Implement matching-passage focus and chapter grouping.
4. Update the header, About panel, and start-exploring card.

### Phase 3: Exploration controls

1. Reorganize filters and add era presets.
2. Add broad place-category mapping and validation.
3. Add timeline presets, out-of-range feedback, and announcements.
4. Revise one-item and multi-item comparison behavior.

### Phase 4: Responsive and visual refinement

1. Correct mobile map proportions and add the discovery sheet.
2. Reduce header height and fix narrow-screen controls/badges.
3. Apply border, typography, spacing, control, and contrast refinements.
4. Complete responsive, keyboard, zoom, and reduced-motion QA.

## 12. Definition of done

The redesign is complete when:

- The persistent desktop results column has been removed and all settlements remain discoverable.
- Passage-text search results visibly explain their match and open at the relevant passage.
- Book content appears in the first viewport of settlement details.
- First-time visitors receive a clear value proposition and actionable starting points.
- Chapter, era, and broad place-category filters are easier to reach than advanced taxonomy/date controls.
- The timeline has understandable presets and no longer depends on unlabeled zoom experimentation.
- The portrait mobile map no longer contains a large unused area.
- Full comparison requires at least two settlements and emphasizes book-relevant dimensions.
- The existing visual identity is recognizably preserved with clearer hierarchy and readability.
- Back-button behavior, URL state, focus management, keyboard navigation, mobile layouts, and automated tests meet the requirements above.

