#!/usr/bin/env python3
"""Validate relational integrity and source fidelity for the settlement dataset."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def check(name: str, passed: bool, observed: object, expected: object, detail: str = "") -> dict[str, object]:
    return {
        "check": name,
        "status": "PASS" if passed else "FAIL",
        "observed": observed,
        "expected": expected,
        "detail": detail,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("paragraphs_json", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("output_csv", type=Path)
    args = parser.parse_args()

    settlements = read_csv(args.dataset_dir / "settlements.csv")
    mentions = read_csv(args.dataset_dir / "settlement_mentions.csv")
    references = read_csv(args.dataset_dir / "references.csv")
    paragraphs = {
        row["paragraph_id"]: row
        for row in json.loads(args.paragraphs_json.read_text(encoding="utf-8"))
    }

    checks: list[dict[str, object]] = []
    settlement_ids = [row["settlement_id"] for row in settlements]
    settlement_names = [row["canonical_name"] for row in settlements]
    mention_ids = [row["mention_id"] for row in mentions]
    reference_keys = {row["bibliography_key"] for row in references}
    settlement_lookup = {row["settlement_id"]: row for row in settlements}

    checks.append(check("Settlement IDs are unique", len(set(settlement_ids)) == len(settlement_ids), len(set(settlement_ids)), len(settlement_ids)))
    checks.append(check("Canonical settlement names are unique", len(set(settlement_names)) == len(settlement_names), len(set(settlement_names)), len(settlement_names)))
    checks.append(check("Mention IDs are unique", len(set(mention_ids)) == len(mention_ids), len(set(mention_ids)), len(mention_ids)))

    mention_grain = [(row["settlement_id"], row["paragraph_id"]) for row in mentions]
    checks.append(check("Settlement-paragraph grain is unique", len(set(mention_grain)) == len(mention_grain), len(set(mention_grain)), len(mention_grain)))

    orphan_mentions = [row["mention_id"] for row in mentions if row["settlement_id"] not in settlement_lookup]
    checks.append(check("All mentions link to a settlement", not orphan_mentions, len(orphan_mentions), 0, " | ".join(orphan_mentions[:10])))

    name_mismatches = [
        row["mention_id"]
        for row in mentions
        if row["settlement_id"] in settlement_lookup
        and row["canonical_name"] != settlement_lookup[row["settlement_id"]]["canonical_name"]
    ]
    checks.append(check("Mention names match canonical settlement names", not name_mismatches, len(name_mismatches), 0, " | ".join(name_mismatches[:10])))

    source_mismatches = []
    missing_paragraphs = []
    source_line_mismatches = []
    for row in mentions:
        source = paragraphs.get(row["paragraph_id"])
        if source is None:
            missing_paragraphs.append(row["mention_id"])
            continue
        if row["complete_paragraph_text"] != source["paragraph_text"]:
            source_mismatches.append(row["mention_id"])
        if (row["source_line_start"], row["source_line_end"]) != (
            str(source["source_line_start"]),
            str(source["source_line_end"]),
        ):
            source_line_mismatches.append(row["mention_id"])
    checks.append(check("Every mention links to an extracted source paragraph", not missing_paragraphs, len(missing_paragraphs), 0, " | ".join(missing_paragraphs[:10])))
    checks.append(check("Paragraph text is an exact source-extraction match", not source_mismatches, len(source_mismatches), 0, " | ".join(source_mismatches[:10])))
    checks.append(check("Mention source line ranges match extraction", not source_line_mismatches, len(source_line_mismatches), 0, " | ".join(source_line_mismatches[:10])))

    coordinate_errors = []
    unlocated = []
    for row in settlements:
        lat, lon = row["latitude"], row["longitude"]
        if bool(lat) != bool(lon):
            coordinate_errors.append(f"{row['canonical_name']}: unpaired")
        elif not lat:
            unlocated.append(row["canonical_name"])
        else:
            try:
                lat_value, lon_value = float(lat), float(lon)
                if not (-90 <= lat_value <= 90 and -180 <= lon_value <= 180):
                    coordinate_errors.append(f"{row['canonical_name']}: out of bounds")
            except ValueError:
                coordinate_errors.append(f"{row['canonical_name']}: nonnumeric")
    checks.append(check("Coordinates are paired, numeric, and in bounds", not coordinate_errors, len(coordinate_errors), 0, " | ".join(coordinate_errors[:10])))
    intended_unlocated = {"Aztlán", "Onondaga town", "Hor-mer"}
    checks.append(check("Only intentionally unlocated settlements lack coordinates", set(unlocated) == intended_unlocated, " | ".join(sorted(unlocated)), " | ".join(sorted(intended_unlocated))))

    year_errors = []
    for row in settlements:
        start, end = row["occupation_start_year"], row["occupation_end_year"]
        try:
            if start and end and int(start) > int(end):
                year_errors.append(row["canonical_name"])
        except ValueError:
            year_errors.append(row["canonical_name"])
    checks.append(check("Occupation intervals are chronologically ordered", not year_errors, len(year_errors), 0, " | ".join(year_errors[:10])))

    paragraph_counts = Counter(row["settlement_id"] for row in mentions)
    count_mismatches = [
        row["canonical_name"]
        for row in settlements
        if int(row["mention_paragraph_count"]) != paragraph_counts[row["settlement_id"]]
    ]
    settlements_without_mentions = [row["canonical_name"] for row in settlements if not paragraph_counts[row["settlement_id"]]]
    checks.append(check("Stored mention counts match mention rows", not count_mismatches, len(count_mismatches), 0, " | ".join(count_mismatches[:10])))
    checks.append(check("Every settlement has at least one paragraph", not settlements_without_mentions, len(settlements_without_mentions), 0, " | ".join(settlements_without_mentions[:10])))

    unresolved_reference_keys = []
    empty_full_entries = []
    for row in mentions:
        keys = [value.strip() for value in row["bibliography_keys"].split(" | ") if value.strip()]
        entries = [value.strip() for value in row["full_bibliography_entries"].split(" | ") if value.strip()]
        unresolved_reference_keys.extend(key for key in keys if key not in reference_keys)
        if keys and len(entries) != len(keys):
            empty_full_entries.append(row["mention_id"])
    checks.append(check("Every cited bibliography key links to the references table", not unresolved_reference_keys, len(unresolved_reference_keys), 0, " | ".join(sorted(set(unresolved_reference_keys))[:10])))
    checks.append(check("Every cited key has a full bibliography entry", not empty_full_entries, len(empty_full_entries), 0, " | ".join(empty_full_entries[:10])))

    forbidden_names = {"Sacramento", "Trypillia", "Omelas"}
    present_forbidden = sorted(forbidden_names & set(settlement_names))
    checks.append(check("Known river/culture/fiction false positives are excluded", not present_forbidden, len(present_forbidden), 0, " | ".join(present_forbidden)))

    intentionally_removed = {
        "Aberdeen", "Amman", "Amsterdam", "Batman", "Beirut", "Bologna", "Brighton", "Brno",
        "Chicago", "Damascus", "Delhi", "East St. Louis", "Gaza City", "Glasgow", "Hiroshima",
        "Jerusalem", "Kraków", "Kyiv", "Los Angeles", "Madrid", "Mbanza Kongo", "Mérida",
        "Mexico City", "Montreal", "Nagasaki", "New York City", "Paris", "Quito", "Salamanca",
        "Samarkand", "Santiago", "Seville", "Sofia", "Tbilisi", "Toledo", "Vancouver", "Venice",
    }
    present_removed = sorted(intentionally_removed & set(settlement_names))
    checks.append(check("Intentionally removed settlements are absent", not present_removed, len(present_removed), 0, " | ".join(present_removed)))

    varna_false_matches = [
        row["mention_id"] for row in mentions
        if row["canonical_name"] == "Varna" and row["paragraph_id"] == "L2929"
    ]
    checks.append(check("Varna caste-system false positive is excluded", not varna_false_matches, len(varna_false_matches), 0, " | ".join(varna_false_matches)))

    checks.append(check("Dataset contains substantive settlement coverage", len(settlements) >= 130, len(settlements), ">= 130"))
    checks.append(check("Dataset contains source-context coverage", len(mentions) >= 600, len(mentions), ">= 600"))
    checks.append(check("Dataset contains linked bibliography coverage", len(references) >= 250, len(references), ">= 250"))

    report = {
        "summary": {
            "settlements": len(settlements),
            "mentions": len(mentions),
            "references": len(references),
            "checks": len(checks),
            "passed": sum(row["status"] == "PASS" for row in checks),
            "failed": sum(row["status"] == "FAIL" for row in checks),
            "unlocated_settlements": sorted(unlocated),
        },
        "checks": checks,
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["check", "status", "observed", "expected", "detail"],
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(checks)

    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    if report["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
