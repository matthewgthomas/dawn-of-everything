#!/usr/bin/env python3
"""Generate Wikidata SPARQL batches and merge their JSON results.

The query deliberately limits matches to human settlements and archaeological
sites. Results are evidence candidates, not automatic inclusion decisions.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


QUERY_TEMPLATE = """PREFIX bd: <http://www.bigdata.com/rdf#>
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
  OPTIONAL {{
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }}
  OPTIONAL {{ ?item schema:description ?description . FILTER(LANG(?description) = "en") }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
ORDER BY ?candidate ?item
"""

SETTLEMENT_TERMS = re.compile(
    r"\b(?:archaeological site|prehistoric site|site|settlement|village|town|city|"
    r"metropolis|capital|camp|hamlet|pueblo|tell|mound|complex|cave|earthworks)s?\b",
    re.IGNORECASE,
)


def sparql_quote(value: str) -> str:
    value = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return f'    "{value}"@en'


def generate(candidate_json: Path, output_dir: Path, batch_size: int) -> None:
    payload = json.loads(candidate_json.read_text(encoding="utf-8"))
    names = []
    for name, details in payload.items():
        labels = details.get("labels", {})
        strong_context = False
        for mention in details.get("mentions", []):
            context = mention.get("paragraph_text", "")
            pos = context.casefold().find(name.casefold())
            if pos >= 0 and SETTLEMENT_TERMS.search(context[max(0, pos - 140) : pos + len(name) + 140]):
                strong_context = True
                break
        if any(label in labels for label in ("GPE", "LOC", "FAC", "RULE")) or strong_context:
            names.append(name)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index in range(0, len(names), batch_size):
        batch = names[index : index + batch_size]
        query_path = output_dir / f"batch_{index // batch_size + 1:03d}.rq"
        response_path = output_dir / f"batch_{index // batch_size + 1:03d}.json"
        query_path.write_text(
            QUERY_TEMPLATE.format(values="\n".join(sparql_quote(name) for name in batch)),
            encoding="utf-8",
        )
        manifest.append(
            {
                "query": str(query_path),
                "response": str(response_path),
                "candidate_count": len(batch),
            }
        )
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"candidates": len(names), "batches": len(manifest), "output_dir": str(output_dir)}))


def parse_point(value: str) -> tuple[float | None, float | None]:
    match = re.fullmatch(r"Point\(([-\d.]+) ([-\d.]+)\)", value or "")
    if not match:
        return None, None
    return float(match.group(2)), float(match.group(1))


def merge(response_dir: Path, output_csv: Path) -> None:
    rows: list[dict[str, object]] = []
    for response_path in sorted(response_dir.glob("batch_*.json")):
        payload = json.loads(response_path.read_text(encoding="utf-8"))
        for binding in payload.get("results", {}).get("bindings", []):
            def value(key: str) -> str:
                return binding.get(key, {}).get("value", "")

            latitude, longitude = parse_point(value("coord"))
            rows.append(
                {
                    "candidate": value("candidate"),
                    "wikidata_id": value("item").rsplit("/", 1)[-1],
                    "wikidata_label": value("itemLabel"),
                    "description": value("description"),
                    "latitude": latitude,
                    "longitude": longitude,
                    "instance_id": value("instance").rsplit("/", 1)[-1],
                    "instance_label": value("instanceLabel"),
                    "country_id": value("country").rsplit("/", 1)[-1],
                    "country_label": value("countryLabel"),
                    "inception": value("inception"),
                    "dissolved": value("dissolved"),
                    "sitelinks": value("sitelinks"),
                    "wikipedia_url": value("article"),
                    "wikidata_url": value("item"),
                }
            )
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "candidate",
        "wikidata_id",
        "wikidata_label",
        "description",
        "latitude",
        "longitude",
        "instance_id",
        "instance_label",
        "country_id",
        "country_label",
        "inception",
        "dissolved",
        "sitelinks",
        "wikipedia_url",
        "wikidata_url",
    ]
    with output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"rows": len(rows), "output": str(output_csv)}))


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    gen = subparsers.add_parser("generate")
    gen.add_argument("candidate_json", type=Path)
    gen.add_argument("output_dir", type=Path)
    gen.add_argument("--batch-size", type=int, default=80)
    combine = subparsers.add_parser("merge")
    combine.add_argument("response_dir", type=Path)
    combine.add_argument("output_csv", type=Path)
    args = parser.parse_args()
    if args.command == "generate":
        generate(args.candidate_json, args.output_dir, args.batch_size)
    else:
        merge(args.response_dir, args.output_csv)


if __name__ == "__main__":
    main()
