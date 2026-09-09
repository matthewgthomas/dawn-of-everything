# Settlement-area research dataset

`settlement_areas.csv` is a companion to the canonical settlement list and is
bundled directly into the app. The generated file contains one or more dated area
observations for every canonical settlement and an explicit `unknown` row when no
defensible settlement-footprint estimate was found.

## Scope and source policy

- Values stated in *The Dawn of Everything* are linked to exact line locations in
  `book/The_Dawn_of_Everything.txt`.
- Other values come from peer-reviewed publications, archaeological monographs,
  excavation projects, official archaeology bodies, government heritage sources,
  or official statistics. Wikipedia-only figures were not accepted.
- An inhabited or built settlement footprint is preferred. A walled extent,
  archaeological tell, ceremonial enclosure, mapped survey window, heritage
  property, or current administrative area is used only when it is the relevant
  published measurement and is identified in `area_basis` and `notes`.
- Heritage/property acreage was rejected where it would misrepresent a settlement
  footprint. Notable examples include Durrington Walls, Tikal, Cuicuilco, Copán,
  Yaxchilán, Aguada Fénix, Abydos, and Spiro.
## Time and uncertainty conventions

- Negative years are BCE and positive years are CE; year zero is not used.
- A settlement may have several rows when its area changed through time. Uruk,
  Harappa, Nineveh, Nippur, Kish, Taosi, Hierakonpolis, Chavín, Erlitou, Palenque,
  and other multi-phase sites retain those changes rather than one timeless value.
- `area_hectares_min` and `area_hectares_max` preserve ranges and one-sided
  statements. For `over`/`at least`, only the minimum is populated; for
  `approaching`/`no larger than`, only the maximum is populated.
- `is_preferred = false` retains useful project-book estimates that overlap with a
  more phase-specific or newer preferred observation. This occurs for Uruk,
  Harappa, and Taljanky.
- A precise unit conversion does not increase the precision of the source. The
  source's qualifier remains in `qualifier`.

## App ranking convention

The app's settlement-area view lists each filtered settlement once. It selects
the largest preferred observation as that settlement's peak estimate, using the
midpoint of a bounded range or the populated bound of a one-sided estimate. Ties
use the latest dated phase and then the curated CSV order. Non-preferred rows are
excluded from the ranking but remain visible in the settlement's Area details.

Because the observations span roughly 1 to 3,000 hectares, comparison bars use
a labelled logarithmic scale. The app presents decimal hectare and square-kilometre
values to no more than three significant digits while retaining the source values
in this dataset for ranking and audit. Settlements with unknown areas are retained
in a separate expandable group rather than being omitted.

## Comparators

Every known observation gets two landmark comparisons from
[`area_comparators.json`](area_comparators.json). The 13 references span the Eiffel
Tower's base, NASA's Vehicle Assembly Building, the Great Pyramid's footprint,
Alcatraz Island, the Taj Mahal gardens, Bangkok's Grand Palace grounds, Vatican
City, Beijing's Forbidden City, the Temple of Heaven grounds, the Glastonbury
Festival site, the park at Versailles, Heathrow Airport, and Burning Man's Black
Rock City. Sources were checked on 9 September 2026; dated event boundaries are
identified in each reference's `basis`.

The generator selects the two closest areas by absolute log ratio: a reference
half as large is as close as one twice as large. Selection uses the midpoint for
ranges and the populated bound for one-sided estimates. Catalogue order breaks
ties, so equal settlement sizes always get the same comparisons.

The displayed text retains both ends of ranges and distinctions between `over`,
`at least`, `approaching`, and `no larger than`. Single estimates within 5% of a
simple fraction or multiple use phrases such as “about half the area” or “about
the same area”; other ratios use two significant digits. These are approximate
land-area comparisons, not additional archaeological measurements or claims
about population, building volume, or whether one shape fits inside another.

The original `comparator_*` columns hold the first comparison; matching
`secondary_comparator_*` columns hold the second. Both include the text,
reference area in hectares, source URL, and boundary description (`*_basis`).
Unknown observations leave all comparator fields empty. The app shows both
comparisons in the area list and overview, with source links and reference
boundaries in each phase's Area details.

Conversions use 1 acre = 0.40468564224 ha and 1 square mile = 258.9988110336 ha.
The Eiffel Tower reference is calculated from its published 125 × 125 m base
square. Reference areas retain conversion precision for calculation, while the
app displays no more than three significant digits.

## Rebuilding and QA

Run:

```sh
python3 scripts/build_settlement_area_research.py
```

The generator starts from `data/derived/settlements.csv`, so every canonical
settlement receives coverage. QA checks should confirm 144 unique settlement IDs,
exact hectare-to-km² conversion, a source or book locator for every known value,
and a comparator citation for every known value.
