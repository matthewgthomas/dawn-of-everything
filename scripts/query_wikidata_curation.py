#!/usr/bin/env python3
"""Generate exact-label Wikidata SPARQL batches for the curated settlements."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


QUERY = """PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT DISTINCT ?candidate ?item ?itemLabel ?description ?coord ?instance ?instanceLabel
                ?country ?countryLabel ?inception ?dissolved ?sitelinks ?article WHERE {{
  VALUES ?candidate {{
{values}
  }}
  ?item (rdfs:label|skos:altLabel) ?candidate .
  FILTER(LANG(?candidate) = "" || LANG(?candidate) = "en")
  VALUES ?root {{ wd:Q486972 wd:Q839954 }}
  ?item wdt:P31 ?instance .
  ?instance wdt:P279* ?root .
  OPTIONAL {{ ?item wdt:P625 ?coord }}
  OPTIONAL {{ ?item wdt:P17 ?country }}
  OPTIONAL {{ ?item wdt:P571 ?inception }}
  OPTIONAL {{ ?item wdt:P576 ?dissolved }}
  OPTIONAL {{ ?item wikibase:sitelinks ?sitelinks }}
  OPTIONAL {{ ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }}
  OPTIONAL {{ ?item schema:description ?description . FILTER(LANG(?description) = "en") }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
ORDER BY ?candidate ?item
"""


def quote(value: str) -> str:
    return '    "' + value.replace("\\", "\\\\").replace('"', '\\"') + '"@en'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("curation_csv", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--batch-size", type=int, default=70)
    args = parser.parse_args()

    names: list[str] = []
    with args.curation_csv.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            for name in [row["canonical_name"], *row["aliases"].split("|")]:
                name = name.strip()
                if name and name not in names and "(" not in name:
                    names.append(name)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index in range(0, len(names), args.batch_size):
        batch = names[index : index + args.batch_size]
        number = index // args.batch_size + 1
        query_path = args.output_dir / f"batch_{number:03d}.rq"
        response_path = args.output_dir / f"batch_{number:03d}.json"
        query_path.write_text(QUERY.format(values="\n".join(quote(name) for name in batch)), encoding="utf-8")
        manifest.append({"query": str(query_path), "response": str(response_path), "candidate_count": len(batch)})
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"names": len(names), "batches": len(manifest)}))


if __name__ == "__main__":
    main()
