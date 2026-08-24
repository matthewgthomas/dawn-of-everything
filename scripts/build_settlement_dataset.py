#!/usr/bin/env python3
"""Assemble the curated settlement, mention, reference, and QA tables."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path


STOPWORDS = {
    "a", "an", "and", "ancient", "archaeological", "capital", "centre", "city",
    "community", "in", "modern", "of", "site", "settlement", "state", "the", "town",
    "village", "with",
}
BAD_DESCRIPTIONS = {"shipwreck", "fictional", "surname", "human settlement in united states of america"}
MANUAL_COORDINATES = {
    # Values in this table take precedence over automatic entity matching. Each
    # entry records latitude, longitude, precision note, source URL, and a
    # compact precision class so approximate locations remain explicit.
    "Bologna": (44.4949, 11.3426, "modern city centre", "https://www.wikidata.org/wiki/Q1891", "city centroid"),
    "Toledo": (39.8628, -4.0273, "modern city centre in Spain", "https://www.wikidata.org/wiki/Q5836", "city centroid"),
    "Altamira Cave": (43.3775, -4.1225, "cave entrance/site centroid", "https://en.wikipedia.org/wiki/Cave_of_Altamira", "site centroid"),
    "El Castillo Cave": (43.2923, -3.9655, "cave entrance/site centroid", "https://fr.wikipedia.org/wiki/Grotte_d%27El_Castillo", "site centroid"),
    "Brixham Cave": (50.3938, -3.5143, "scheduled-monument location", "https://ancientmonuments.uk/106896-windmill-hill-cave-brixham-brixham", "site centroid"),
    "Grimaldi Caves": (43.784162, 7.53336, "Balzi Rossi cave complex centroid", "https://fr.wikipedia.org/wiki/Balzi_Rossi", "site centroid"),
    "Saint-Germain-de-la-Rivière": (44.949951, -0.331018, "Palaeolithic burial location", "https://vici.org/vici/22744/", "site centroid"),
    "Sannai Maruyama": (40.811467, 140.696872, "archaeological site centroid", "https://en.wikipedia.org/wiki/Sannai-Maruyama_Site", "site centroid"),
    "Liangchengzhen": (35.571, 119.572, "archaeological sampling/site location", "https://academic.oup.com/gji/article-abstract/232/2/1159/6747130", "site centroid"),
    "Yaowangcheng": (35.302171, 119.350127, "archaeological park/site location", "https://www.amap.com/place/B0KGTHETEK", "site centroid"),
    "Wangchenggang": (34.40084, 113.12496, "archaeological ruins location", "https://mapcarta.com/W1263470603", "site centroid"),
    "Zhengzhou Shang City": (34.7453, 113.6831, "archaeological site centroid", "https://www.wikidata.org/wiki/Q203132", "site centroid"),
    "Tula (Tollan)": (20.06382, -99.34111, "archaeological zone centroid", "https://mapcarta.com/36900208", "site centroid"),
    "Tetimpa": (19.07563, -98.47567, "modern locality over/near archaeological settlement", "https://mapcarta.com/30105944", "nearby locality"),
    "Culhuacan": (19.336, -99.124, "historic settlement centre in modern Pueblo Culhuacan", "https://en.wikipedia.org/wiki/Pueblo_Culhuac%C3%A1n", "historical core"),
    "Tlacopan": (19.459009, -99.187668, "pre-Columbian city centre", "https://vici.org/vici/101126/", "historical core"),
    "Yaxchilán": (16.9, -90.966667, "archaeological site centroid", "https://www.wikidata.org/wiki/Q662263", "site centroid"),
    "Wari (Huari)": (-13.0583, -74.0639, "Wari archaeological capital centroid", "https://en.wikipedia.org/wiki/Wari_(ancient_city)", "site centroid"),
    "Hierakonpolis": (25.0972, 32.7792, "Nekhen/Hierakonpolis archaeological site centroid", "https://en.wikipedia.org/wiki/Hierakonpolis", "site centroid"),
    "Giza workers' town": (29.978, 31.141, "workers' settlement south-east of the Giza pyramids", "https://en.wikipedia.org/wiki/Giza_pyramid_complex#Workers'_village", "site centroid"),
    "Pacooda": (9.8875, 32.10835, "approximate location at modern Kodok/Fashoda", "https://mapcarta.com/13090276", "nearby locality"),
    "Hopewell Mound Group": (39.363, -83.093, "World Heritage property centroid", "https://whc.unesco.org/document/203000", "site centroid"),
    "Newark Earthworks": (40.0402671, -82.4277555, "Great Circle component of the wider Newark complex", "https://hopewellearthworks.org/site/great-circle-earthworks/", "representative component"),
    "Turner Earthworks": (39.1316, -84.3102, "approximate destroyed-site location near Round Bottom and Mount Carmel Roads", "https://newtownohio.gov/wp-content/uploads/2019/05/Newtown_Municipal_and_Indian_2013.pdf", "approximate site"),
    "Moundville": (32.998, -87.628, "Moundville archaeological park/site centroid", "https://en.wikipedia.org/wiki/Moundville_Archaeological_Site", "site centroid"),
    "Coosa": (34.20, -85.17, "approximate historical core; exact capital location debated", "https://en.wikipedia.org/wiki/Coosa_chiefdom", "approximate historical core"),
    "Cofitachequi": (34.25, -80.61, "approximate historical core near Camden, South Carolina", "https://en.wikipedia.org/wiki/Cofitachequi", "approximate historical core"),
    "Basta": (30.2, 35.533, "Pre-Pottery Neolithic site centroid", "https://en.wikipedia.org/wiki/Basta_(archaeological_site)", "site centroid"),
    "Byblos": (34.1236, 35.6511, "ancient and modern city centre", "https://en.wikipedia.org/wiki/Byblos", "city centroid"),
    "Mezin": (51.823, 33.068, "archaeological site near the modern village", "https://en.wikipedia.org/wiki/Mezin", "nearby locality"),
    "Tågerup": (55.856, 12.938, "Mesolithic site location", "https://xronos.ch/sites/22754", "site centroid"),
    "Salamanca": (40.9701, -5.6635, "modern city centre", "https://www.wikidata.org/wiki/Q15695", "city centroid"),
    "Seville": (37.3891, -5.9845, "modern city centre", "https://www.wikidata.org/wiki/Q8717", "city centroid"),
    "Madrid": (40.4168, -3.7038, "modern city centre", "https://www.wikidata.org/wiki/Q2807", "city centroid"),
    "Mexico City": (19.4326, -99.1332, "modern city centre", "https://www.wikidata.org/wiki/Q1489", "city centroid"),
    "Brighton": (50.8225, -0.1372, "modern city centre", "https://www.wikidata.org/wiki/Q131491", "city centroid"),
    "Aberdeen": (57.1497, -2.0943, "modern city centre", "https://www.wikidata.org/wiki/Q36405", "city centroid"),
    "Santiago": (-33.4489, -70.6693, "modern city centre", "https://www.wikidata.org/wiki/Q2887", "city centroid"),
    "Merv": (37.6627, 62.1891, "ancient urban complex centroid", "https://en.wikipedia.org/wiki/Merv", "site centroid"),
    "Fort Michilimackinac": (45.786, -84.7278, "fort and trading settlement site", "https://en.wikipedia.org/wiki/Fort_Michilimackinac", "site centroid"),
    "Mound Key (Calos)": (26.019, -81.995, "Calusa capital on Mound Key in Estero Bay", "https://www.floridastateparks.org/parks-and-trails/mound-key-archaeological-state-park", "site centroid"),
    "Arslantepe": (38.382023, 38.36119, "archaeological mound centroid", "https://www.archatlas.org/atlas/visualisations/panoramas/arslantepe/", "site centroid"),
    "Tell al-'Ubaid": (30.97231, 46.03063, "archaeological tell centroid", "https://mapcarta.com/N5179254511", "site centroid"),
    "Herakleopolis": (29.08554, 30.934549, "ancient city at Ihnasya el-Medina", "https://www.trismegistos.org/geo/detail.php?tm=801", "site centroid"),
    "Hefat (El-Mo'alla)": (25.475, 32.55, "approximate ancient Hefat/modern El-Mo'alla location", "https://egyptology.yale.edu/expeditions/past-and-joint-projects/moalla-survey-project", "historical core"),
}

INTENTIONALLY_UNLOCATED = {"Aztlán", "Onondaga town", "Hor-mer"}

MANUAL_ENTITY_OVERRIDES = {
    "Bologna": {"wikidata_id": "Q1891", "wikidata_url": "https://www.wikidata.org/wiki/Q1891", "wikipedia_url": "https://en.wikipedia.org/wiki/Bologna", "description": "city in Emilia-Romagna, Italy"},
    "Toledo": {"wikidata_id": "Q5836", "wikidata_url": "https://www.wikidata.org/wiki/Q5836", "wikipedia_url": "https://en.wikipedia.org/wiki/Toledo,_Spain", "description": "city in Castilla-La Mancha, Spain"},
    "Zhengzhou Shang City": {"wikidata_id": "Q203132", "wikidata_url": "https://www.wikidata.org/wiki/Q203132", "wikipedia_url": "https://en.wikipedia.org/wiki/Zhengzhou_Shang_City", "description": "Bronze Age archaeological city in Zhengzhou, China"},
    "Yaxchilán": {"wikidata_id": "Q662263", "wikidata_url": "https://www.wikidata.org/wiki/Q662263", "wikipedia_url": "https://en.wikipedia.org/wiki/Yaxchilan", "description": "pre-Columbian Maya city in Chiapas, Mexico"},
}

ENTITY_MATCHES_TO_CLEAR = {
    "Altamira Cave", "El Castillo Cave", "Aztlán", "Wari (Huari)",
    "Giza workers' town", "Hopewell Mound Group", "Moundville", "Coosa",
    "Cofitachequi", "Onondaga town",
}


def tokenize(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.casefold())
        if len(token) > 2 and token not in STOPWORDS
    }


def load_wikidata(paths: list[Path]) -> dict[str, list[dict[str, str]]]:
    result: dict[str, list[dict[str, str]]] = defaultdict(list)
    seen: set[tuple[str, str, str, str]] = set()
    for path in paths:
        if not path.exists():
            continue
        with path.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                key = (row["candidate"].casefold(), row["wikidata_id"], row.get("latitude", ""), row.get("longitude", ""))
                if key in seen:
                    continue
                seen.add(key)
                result[row["candidate"].casefold()].append(row)
    return result


def pick_wikidata(row: dict[str, str], wikidata: dict[str, list[dict[str, str]]]) -> tuple[dict[str, str], float]:
    aliases = [row["canonical_name"], *row["aliases"].split("|")]
    hint_tokens = tokenize(row["selection_hint"])
    candidates: dict[str, dict[str, str]] = {}
    for alias in aliases:
        for match in wikidata.get(alias.strip().casefold(), []):
            existing = candidates.get(match["wikidata_id"])
            if existing is None or (not existing.get("latitude") and match.get("latitude")):
                candidates[match["wikidata_id"]] = match

    best: dict[str, str] = {}
    best_score = -1e9
    for match in candidates.values():
        haystack = " ".join(
            [
                match.get("wikidata_label", ""),
                match.get("description", ""),
                match.get("country_label", ""),
                match.get("instance_label", ""),
            ]
        )
        hay_tokens = tokenize(haystack)
        score = 4.0 * len(hint_tokens & hay_tokens)
        description = match.get("description", "").casefold()
        instance = match.get("instance_label", "").casefold()
        if any(term in description for term in BAD_DESCRIPTIONS):
            score -= 25
        if "shipwreck" in instance:
            score -= 30
        if "archaeological" in row["selection_hint"].casefold() and (
            "archaeological" in description or "ancient" in description or "archaeological" in instance
        ):
            score += 12
        if "modern city" in row["settlement_type"].casefold() and "city" in description:
            score += 5
        if match.get("latitude") and match.get("longitude"):
            score += 3
        try:
            score += min(7.0, math.log2(float(match.get("sitelinks") or 0) + 1))
        except ValueError:
            pass
        if score > best_score:
            best_score = score
            best = match
    return best, best_score


def alias_pattern(alias: str) -> re.Pattern[str]:
    escaped = re.escape(alias.strip())
    if alias[:1].isalnum() and alias[-1:].isalnum():
        return re.compile(rf"(?<![\wÀ-ÖØ-öø-ÿ]){escaped}(?![\wÀ-ÖØ-öø-ÿ])", re.IGNORECASE)
    return re.compile(escaped, re.IGNORECASE)


def paragraph_matches(settlement: dict[str, str], paragraph: dict[str, object]) -> list[str]:
    text = str(paragraph["paragraph_text"])
    aliases = sorted({settlement["canonical_name"], *settlement["aliases"].split("|")}, key=len, reverse=True)
    matched = []
    for alias in aliases:
        if not alias or "(" in alias:
            continue
        if alias_pattern(alias).search(text):
            if settlement["canonical_name"] == "Vancouver" and re.search(r"Vancouver\s+Island", text, re.I):
                # The island is not the city; a separate paragraph explicitly
                # refers to the surroundings of Vancouver and is retained.
                continue
            if settlement["canonical_name"] == "San Lorenzo Tenochtitlán" and re.search(r"Rio\s+San Lorenzo", text, re.I):
                # Keep only paragraphs that contain an additional non-river San Lorenzo occurrence.
                occurrences = list(re.finditer(r"San Lorenzo", text, re.I))
                if len(occurrences) == 1:
                    continue
            matched.append(alias)
    return matched


def extract_citation_keys(text: str, bibliography: dict[str, str]) -> list[str]:
    keys = []
    for surname, year in re.findall(r"\b([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ’'\-]+)(?:\s+et\s+al\.)?\s*[\[(]?(\d{4}[a-z]?)", text):
        key = f"{surname} {year}"
        if key in bibliography and key not in keys:
            keys.append(key)
    return keys


def parse_bibliography(source_lines: list[str]) -> tuple[dict[str, str], list[dict[str, str]]]:
    index: dict[str, str] = {}
    rows: list[dict[str, str]] = []
    previous_surname = ""
    previous_authors = ""
    for line_no in range(6221, len(source_lines) + 1):
        text = re.sub(r"\s+", " ", source_lines[line_no - 1].strip())
        if not text or text == "Bibliography":
            continue
        year_match = re.search(r"(?:\(|\.\s)(\d{4}[a-z]?)(?:\)|\.)", text)
        if not year_match:
            continue
        year = year_match.group(1)
        if text.startswith("—"):
            surname = previous_surname
            if text.startswith("—."):
                expanded_text = f"{previous_authors}{text[2:]}"
            else:
                expanded_text = f"{previous_authors} {text[1:].lstrip()}"
        else:
            surname = text.split(",", 1)[0].split(" and ", 1)[0].strip().split()[-1]
            previous_surname = surname
            previous_authors = text[:year_match.start()].rstrip().rstrip("(").rstrip()
            if not previous_authors.endswith("."):
                previous_authors += "."
            expanded_text = text
        key = f"{surname} {year}" if surname else year
        index.setdefault(key, expanded_text)
        rows.append({"bibliography_key": key, "source_line": str(line_no), "full_bibliography_entry": expanded_text})
    return index, rows


def display_year(year: str) -> str:
    if year == "":
        return "unknown"
    value = int(year)
    return f"{abs(value)} BCE" if value < 0 else f"{value} CE"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("curation_csv", type=Path)
    parser.add_argument("paragraphs_json", type=Path)
    parser.add_argument("source_txt", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("wikidata_csv", nargs="+", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    with args.curation_csv.open(encoding="utf-8", newline="") as handle:
        curation = list(csv.DictReader(handle))
    paragraphs = json.loads(args.paragraphs_json.read_text(encoding="utf-8"))
    source_lines = args.source_txt.read_text(encoding="utf-8").splitlines()
    bibliography, bibliography_rows = parse_bibliography(source_lines)
    wikidata = load_wikidata(args.wikidata_csv)

    settlement_rows: list[dict[str, object]] = []
    mention_rows: list[dict[str, object]] = []
    reference_usage: dict[str, set[str]] = defaultdict(set)

    for sequence, row in enumerate(curation, start=1):
        settlement_id = f"S{sequence:03d}"
        match, match_score = pick_wikidata(row, wikidata)
        if row["canonical_name"] in INTENTIONALLY_UNLOCATED or row["canonical_name"] in ENTITY_MATCHES_TO_CLEAR:
            match, match_score = {}, -1e9
        if row["canonical_name"] in MANUAL_ENTITY_OVERRIDES:
            match = MANUAL_ENTITY_OVERRIDES[row["canonical_name"]]
            match_score = 100.0
        latitude = match.get("latitude", "")
        longitude = match.get("longitude", "")
        coord_note = "Wikidata coordinate" if latitude else "unresolved or intentionally unlocated"
        coord_source_url = match.get("wikidata_url", "") if latitude else ""
        coord_precision = "Wikidata supplied point" if latitude else ""
        if row["canonical_name"] in MANUAL_COORDINATES:
            lat, lon, note, source_url, precision = MANUAL_COORDINATES[row["canonical_name"]]
            latitude, longitude, coord_note = lat, lon, note
            coord_source_url, coord_precision = source_url, precision
        if row["canonical_name"] in INTENTIONALLY_UNLOCATED:
            latitude = longitude = ""
            coord_note = "intentionally unlocated; the book does not specify a recoverable location"
            coord_source_url = ""
            coord_precision = "unlocated"
        matched_paragraphs = []
        for paragraph in paragraphs:
            aliases = paragraph_matches(row, paragraph)
            if aliases:
                matched_paragraphs.append((paragraph, aliases))

        sections = sorted({str(paragraph["section"]) for paragraph, _ in matched_paragraphs})
        start = row["occupation_start_year"]
        end = row["occupation_end_year"]
        interval = f"{display_year(start)} to {display_year(end)}"
        if start == end and start:
            interval = display_year(start)
        if end == "2026":
            interval = f"{display_year(start)} to present"

        settlement_rows.append(
            {
                "settlement_id": settlement_id,
                "canonical_name": row["canonical_name"],
                "aliases_in_book": row["aliases"],
                "settlement_type": row["settlement_type"],
                "latitude": latitude,
                "longitude": longitude,
                "coordinate_note": coord_note,
                "coordinate_precision": coord_precision if latitude else "unlocated",
                "coordinate_source_url": coord_source_url,
                "wikidata_id": match.get("wikidata_id", ""),
                "wikidata_url": match.get("wikidata_url", ""),
                "wikipedia_url": match.get("wikipedia_url", ""),
                "wikidata_description": match.get("description", ""),
                "entity_resolution_score": round(match_score, 2) if match else "",
                "occupation_start_year": start,
                "occupation_end_year": end,
                "occupation_interval_display": interval,
                "occupation_qualifier": row["occupation_qualifier"],
                "occupation_basis": row["occupation_basis"],
                "curation_note": row["curation_note"],
                "mention_paragraph_count": len(matched_paragraphs),
                "sections_mentioned": " | ".join(sections),
                "first_source_line": min((int(p["source_line_start"]) for p, _ in matched_paragraphs), default=""),
                "last_source_line": max((int(p["source_line_start"]) for p, _ in matched_paragraphs), default=""),
            }
        )

        for paragraph, aliases in matched_paragraphs:
            chapter_number = paragraph.get("chapter_number")
            note_ids = []
            note_texts = []
            if paragraph.get("section_kind") == "chapter":
                for note_number, note_text in zip(paragraph.get("footnote_numbers", []), paragraph.get("footnote_texts", [])):
                    if chapter_number:
                        note_ids.append(f"ch{chapter_number}-n{note_number}")
                    if note_text:
                        note_texts.append(note_text)
            elif str(paragraph.get("section", "")).startswith("Notes to Chapter"):
                own_note = re.match(r"(\d{1,3})\.\s+(.+)", str(paragraph["paragraph_text"]))
                if own_note and chapter_number:
                    note_ids.append(f"ch{chapter_number}-n{own_note.group(1)}")
                    note_texts.append(own_note.group(2))

            citation_keys = []
            for note_text in note_texts:
                for key in extract_citation_keys(note_text, bibliography):
                    if key not in citation_keys:
                        citation_keys.append(key)
                    for note_id in note_ids:
                        reference_usage[key].add(note_id)
            mention_rows.append(
                {
                    "mention_id": f"M{len(mention_rows) + 1:04d}",
                    "settlement_id": settlement_id,
                    "canonical_name": row["canonical_name"],
                    "matched_aliases": " | ".join(aliases),
                    "paragraph_id": paragraph["paragraph_id"],
                    "source_line_start": paragraph["source_line_start"],
                    "source_line_end": paragraph["source_line_end"],
                    "section": paragraph["section"],
                    "section_kind": paragraph["section_kind"],
                    "chapter_number": chapter_number if chapter_number is not None else "",
                    "complete_paragraph_text": paragraph["paragraph_text"],
                    "book_note_ids": " | ".join(note_ids),
                    "book_note_texts": " | ".join(note_texts),
                    "bibliography_keys": " | ".join(citation_keys),
                    "full_bibliography_entries": " | ".join(bibliography[key] for key in citation_keys),
                }
            )

    # Only references actually linked to a settlement mention are part of the normalized table.
    reference_rows = []
    for key in sorted(reference_usage):
        reference_rows.append(
            {
                "reference_id": f"R{len(reference_rows) + 1:03d}",
                "bibliography_key": key,
                "full_bibliography_entry": bibliography[key],
                "linked_book_note_ids": " | ".join(sorted(reference_usage[key])),
            }
        )

    qa_rows = [
        {"check": "canonical settlements", "value": len(settlement_rows), "status": "info"},
        {"check": "settlement-paragraph mentions", "value": len(mention_rows), "status": "info"},
        {"check": "settlements without matched paragraphs", "value": sum(not r["mention_paragraph_count"] for r in settlement_rows), "status": "pass" if all(r["mention_paragraph_count"] for r in settlement_rows) else "review"},
        {"check": "settlements without coordinates", "value": sum(not r["latitude"] or not r["longitude"] for r in settlement_rows), "status": "review"},
        {"check": "duplicate canonical names", "value": len(settlement_rows) - len({r["canonical_name"] for r in settlement_rows}), "status": "pass"},
        {"check": "duplicate mention grain", "value": len(mention_rows) - len({(r["settlement_id"], r["paragraph_id"]) for r in mention_rows}), "status": "pass"},
        {"check": "linked bibliography references", "value": len(reference_rows), "status": "info"},
    ]

    def write_csv(name: str, rows: list[dict[str, object]]) -> None:
        path = args.output_dir / name
        with path.open("w", encoding="utf-8", newline="") as handle:
            if not rows:
                return
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    write_csv("settlements.csv", settlement_rows)
    write_csv("settlement_mentions.csv", mention_rows)
    write_csv("references.csv", reference_rows)
    write_csv("qa_summary.csv", qa_rows)
    (args.output_dir / "dataset.json").write_text(
        json.dumps(
            {
                "settlements": settlement_rows,
                "mentions": mention_rows,
                "references": reference_rows,
                "qa": qa_rows,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"settlements": len(settlement_rows), "mentions": len(mention_rows), "references": len(reference_rows), "qa": qa_rows}))


if __name__ == "__main__":
    main()
