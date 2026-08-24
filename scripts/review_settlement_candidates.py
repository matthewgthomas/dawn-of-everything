#!/usr/bin/env python3
"""Create a compact, scored review queue for settlement entity resolution."""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path


TERMS = re.compile(
    r"\b(?:archaeological site|prehistoric site|site|settlement|village|town|city|"
    r"metropolis|capital|camp|hamlet|pueblo|tell|mound|complex|cave|earthworks|"
    r"urban centre|urban center)s?\b",
    re.I,
)
PREPOSITIONS = re.compile(r"\b(?:at|in|from|to|near|outside|inside|around|around|towards|within)\s+$", re.I)
NON_SITE_INSTANCES = {"shipwreck", "academic discipline", "event", "human"}


def intish(value: str) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidates_json", type=Path)
    parser.add_argument("wikidata_csv", type=Path)
    parser.add_argument("output_csv", type=Path)
    args = parser.parse_args()

    candidates = json.loads(args.candidates_json.read_text(encoding="utf-8"))
    matches: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    with args.wikidata_csv.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["instance_label"].casefold() in NON_SITE_INSTANCES:
                continue
            current = matches[row["candidate"]].get(row["wikidata_id"])
            if current is None or (not current.get("latitude") and row.get("latitude")):
                matches[row["candidate"]][row["wikidata_id"]] = row

    output_rows = []
    for name, details in candidates.items():
        labels = details.get("labels", {})
        mentions = details.get("mentions", [])
        score = 0
        explicit = 0
        prepositional = 0
        main_count = 0
        note_count = 0
        sample_contexts = []
        for mention in mentions:
            context = mention["paragraph_text"]
            section = mention["section"]
            if section.startswith("Chapter") or section.startswith("Front matter"):
                main_count += 1
            else:
                note_count += 1
            idx = context.casefold().find(name.casefold())
            if idx >= 0:
                window = context[max(0, idx - 100) : min(len(context), idx + len(name) + 100)]
                if TERMS.search(window):
                    explicit += 1
                if PREPOSITIONS.search(context[max(0, idx - 35) : idx]):
                    prepositional += 1
            if len(sample_contexts) < 2:
                sample_contexts.append(f"L{mention['source_line_start']}: {context}")

        if not any(label in labels for label in ("GPE", "LOC", "FAC", "RULE")) and not explicit:
            continue

        if explicit:
            score += 5 + min(explicit, 3)
        if prepositional:
            score += 1
        if labels.get("GPE"):
            score += 2
        if labels.get("LOC") or labels.get("FAC"):
            score += 1
        if main_count:
            score += 1
        if re.search(r"\b\d{4}[a-z]?\b", name):
            score -= 8
        if len(name) <= 2 or name in {"The", "US", "New", "South", "Middle", "Western", "Northeast", "Southeast", "Southwest"}:
            score -= 6

        ranked = sorted(
            matches.get(name, {}).values(),
            key=lambda row: (intish(row.get("sitelinks", "")), bool(row.get("latitude"))),
            reverse=True,
        )
        best = ranked[0] if ranked else {}
        sitelinks = intish(best.get("sitelinks", ""))
        if sitelinks >= 50:
            score += 3
        elif sitelinks >= 10:
            score += 2
        elif sitelinks >= 3:
            score += 1
        if best.get("latitude"):
            score += 1

        alternatives = " | ".join(
            f"{row.get('wikidata_id')} ({row.get('sitelinks') or 0}): {row.get('description') or row.get('instance_label')}"
            for row in ranked[:4]
        )
        output_rows.append(
            {
                "score": score,
                "candidate": name,
                "mention_count": len(mentions),
                "main_count": main_count,
                "notes_count": note_count,
                "explicit_term_mentions": explicit,
                "prepositional_mentions": prepositional,
                "labels": json.dumps(labels, ensure_ascii=False, sort_keys=True),
                "best_wikidata_id": best.get("wikidata_id", ""),
                "best_description": best.get("description", ""),
                "best_country": best.get("country_label", ""),
                "best_latitude": best.get("latitude", ""),
                "best_longitude": best.get("longitude", ""),
                "best_sitelinks": best.get("sitelinks", ""),
                "alternatives": alternatives,
                "contexts": " || ".join(sample_contexts),
            }
        )

    output_rows.sort(key=lambda row: (-int(row["score"]), str(row["candidate"]).casefold()))
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    fields = list(output_rows[0]) if output_rows else []
    with args.output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(output_rows)
    print(json.dumps({"rows": len(output_rows), "score_6_plus": sum(int(r["score"]) >= 6 for r in output_rows)}))


if __name__ == "__main__":
    main()
