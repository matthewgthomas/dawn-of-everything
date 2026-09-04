# Settlements in *The Dawn of Everything*

This dataset is a curated, paragraph-level catalogue of named human settlements in the substantive text and notes of `book/The_Dawn_of_Everything.txt`. It contains 144 canonical settlements, 613 distinct settlement–paragraph mentions, and 296 bibliography entries linked through the book's note apparatus.

## Scope

A settlement is included when the book names a real place where people lived together: a city, town, village, inhabited archaeological site, seasonal aggregation site, cave habitation or burial site, fort/trading settlement, or historically attested capital. Both ancient sites and modern cities are in scope.

The catalogue draws from the chapter text and chapter notes. The publisher's address, table-of-contents place strings, map labels that never appear substantively, and locations appearing only in bibliography publication data are not treated as mentions. Countries, broad regions, rivers, islands, cultures/ethnonyms, fictional places, individual buildings and intra-urban compounds are excluded unless the book also uses the name for an inhabited settlement. Unnamed generic settlements cannot be assigned a canonical entity and are excluded. Project curation also intentionally omits some otherwise eligible place mentions. `scope_exclusions.csv` records the principal categorical boundary cases.

Every exported mention is tied to an included canonical settlement and retains the complete source paragraph. A paragraph that also names an omitted place remains unchanged when it belongs to a retained settlement.

## Tables and grain

- `settlements.csv`: one row per canonical settlement. It holds aliases found in the book, settlement type, coordinates, entity-resolution metadata, the occupation interval, and provenance/curation notes.
- `settlement_mentions.csv`: one row per settlement–source-paragraph pair. `complete_paragraph_text` is the full extracted paragraph without truncation. The row includes exact line bounds, note IDs and note text, bibliography keys, and complete bibliography entries. A paragraph that names multiple settlements appears once for each settlement.
- `references.csv`: one row per bibliography entry actually linked from at least one settlement mention.
- `qa_summary.csv`: compact build-level metrics.
- `validation_checks.csv` and `validation_report.json`: the independent relational, range, citation-link, and source-fidelity audit.
- `dataset.json`: the three main tables and build QA in a single machine-readable file.
- `map_geography.json`: compact Natural Earth geometry used by the physical basemap; this is presentation data rather than part of the settlement catalogue.

Primary keys are `settlement_id`, `mention_id`, and `reference_id`. Join mentions to settlements with `settlement_id`; bibliography material is also denormalized into each mention so a row remains useful by itself.

## Dates

`occupation_start_year` and `occupation_end_year` use signed astronomical-style integers for sorting: negative values mean BCE and positive values mean CE. There is no year zero implied by the source; this is a storage convention. `occupation_interval_display` is the reader-facing rendering and `occupation_qualifier` communicates approximation or continuity. The dates summarize periods of known habitation rather than claiming unbroken occupation. Blank endpoints mean the evidence does not justify a narrower date.

The occupation dates are a reference synthesis prepared for this dataset; they are not necessarily stated in the paragraph that mentions the settlement. `occupation_basis` and `curation_note` preserve that distinction.

## Coordinates

Coordinates are representative points, not settlement polygons. Most are resolved to Wikidata entities; `coordinate_source_url` records that entity or a documented manual override. `coordinate_precision` distinguishes city centroids, archaeological-site centroids, historical cores, nearby localities, representative components, and approximate locations.

Four rows intentionally have blank coordinates:

- Aztlán is a legendary homeland without a securely identified physical location.
- Hor-mer is insufficiently located in the book and available reference data.
- Onondaga town refers to a historically mobile/ambiguous capital name rather than one uniquely resolved site.
- Ounotisaston is historically attested, but its proposed archaeological identification with the Walker Site remains uncertain.

## References and text fidelity

The `book_note_ids` and `book_note_texts` fields link a mention paragraph to the book's chapter notes. Author–year keys recognized in those notes are resolved against the book's bibliography and expanded into `full_bibliography_entries`. Repeated-author em dashes in the printed bibliography are expanded to the preceding author string so that each exported reference is self-contained. Blank reference fields mean that the relevant paragraph has no linked book note or the note has no resolvable author–year bibliography entry; they do not imply that the settlement has no scholarly literature.

The validator compares every stored paragraph byte-for-byte (after the source parser's whitespace normalization) with the indexed source paragraph and checks the original line range. The current release passes all 22 validation checks.

## Physical basemap

`map_geography.json` is generated from Natural Earth's public-domain 1:50m and 1:110m physical datasets. It retains a zoom-filtered network of major rivers, principal lakes, broad landform regions, and named elevation features. Properties are reduced to the fields used by the interface and coordinates are rounded to four decimal places to keep the static client bundle compact. This geography provides reading context only; it is not part of the book-derived settlement scope or its QA totals.

## Rebuild

The core build is reproducible from the checked-in curation and source text:

```sh
python3 scripts/extract_settlement_candidates.py book/The_Dawn_of_Everything.txt .tmp/extraction
python3 scripts/build_settlement_dataset.py data/settlement_curation.csv .tmp/extraction/paragraphs.json book/The_Dawn_of_Everything.txt data/derived .tmp/wikidata_all_matches.csv .tmp/wikidata_curation_matches.csv
python3 scripts/validate_settlement_dataset.py data/derived .tmp/extraction/paragraphs.json data/derived/validation_report.json data/derived/validation_checks.csv
npm run build:map-geography
```

The Wikidata match caches are query-time discovery aids. Manual coordinate overrides and their source URLs are versioned in `scripts/build_settlement_dataset.py`, so the finalized tables remain reproducible from the included caches.

The physical-map rebuild downloads the source GeoJSON from Natural Earth's official GitHub repository and writes the curated result to `data/derived/map_geography.json`.
