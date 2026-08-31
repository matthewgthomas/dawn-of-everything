# Settlement-area research dataset

`settlement_areas.csv` is a research-only companion to the canonical settlement
list. It is not read by the app. The generated file contains one or more dated
area observations for every canonical settlement and an explicit `unknown` row
when no defensible settlement-footprint estimate was found.

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
- Current-city values from the UN Demographic Yearbook are administrative or
  statistical areas, not remotely sensed built-up footprints.

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

## Comparators

Every known observation gets an automatically scaled contemporary comparator.
The closest useful reference is selected from FIFA's recommended 105 × 68 m
football pitch, St James's Park (about 23 ha), Vatican City (44 ha), Hyde Park
(about 142 ha), Central Park (843 acres), and Richmond Park (about 1,000 ha).
Comparator source URLs are stored per row. Comparators are orientation aids, not
additional measurements of the archaeological site.

## Rebuilding and QA

Run:

```sh
python3 scripts/build_settlement_area_research.py
```

The generator starts from `data/derived/settlements.csv`, so every canonical
settlement receives coverage. QA checks should confirm 174 unique settlement IDs,
exact hectare-to-km² conversion, a source or book locator for every known value,
and a comparator citation for every known value.
