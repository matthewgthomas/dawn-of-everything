#!/usr/bin/env python3
"""Build a high-recall place-name candidate inventory from the book text.

This script does not decide whether a candidate is a human settlement. It preserves
the paragraph and source-line evidence needed for a subsequent manual/entity-
resolution pass.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path


CHAPTER_TITLES = {
    1: "Farewell to Humanity’s Childhood",
    2: "Wicked Liberty",
    3: "Unfreezing the Ice Age",
    4: "Free People, the Origin of Cultures, and the Advent of Private Property",
    5: "Many Seasons Ago",
    6: "Gardens of Adonis",
    7: "The Ecology of Freedom",
    8: "Imaginary Cities",
    9: "Hiding in Plain Sight",
    10: "Why the State Has No Origin",
    11: "Full Circle",
    12: "Conclusion",
}

SETTLEMENT_TERMS = re.compile(
    r"\b(?:archaeological\s+site|prehistoric\s+site|site|settlement|village|town|"
    r"city|metropolis|urban\s+centre|urban\s+center|capital|camp|hamlet|pueblo|"
    r"oppidum|tell|mound|complex|necropolis|civic\s+centre|civic\s+center)s?\b",
    re.IGNORECASE,
)

# A deliberately permissive phrase shape used only near settlement terms.
NAME = r"(?:[A-ZÀ-ÖØ-ÞÇĞİŁŚŠŽ][\wÀ-ÖØ-öø-ÿ’'\-]+(?:\s+(?:de|del|des|du|la|le|of|the|y|[A-ZÀ-ÖØ-ÞÇĞİŁŚŠŽ][\wÀ-ÖØ-öø-ÿ’'\-]+)){0,5})"
AFTER_TERM = re.compile(
    rf"\b(?:site|settlement|village|town|city|metropolis|capital|camp|hamlet|pueblo|tell|mound|complex)\s+(?:of|at|called|known as)?\s*({NAME})"
)
BEFORE_TERM = re.compile(
    rf"({NAME})\s+(?:archaeological\s+site|prehistoric\s+site|site|settlement|village|town|city|metropolis|capital|camp|hamlet|pueblo|tell|mound|complex)\b"
)


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip())


def included_line(line_no: int) -> bool:
    # Figure/map captions plus chapters and notes. Excludes contents, copyright,
    # acknowledgements, foreword, and bibliography/publisher metadata.
    return 133 <= line_no <= 169 or 201 <= line_no <= 6219


def section_map(lines: list[str]) -> dict[int, tuple[str, str]]:
    mapping: dict[int, tuple[str, str]] = {}
    chapter = "Front matter: maps and figures"
    chapter_kind = "front-matter"
    in_notes = False
    for idx, raw in enumerate(lines, start=1):
        text = clean(raw)
        # The Contents page also contains a line reading "Notes"; only the
        # back-matter heading switches the parser into note mode.
        if idx == 4497:
            in_notes = True
            chapter = "Notes"
            chapter_kind = "notes"
        if not in_notes and text.isdigit() and int(text) in CHAPTER_TITLES:
            chapter = f"Chapter {int(text)}: {CHAPTER_TITLES[int(text)]}"
            chapter_kind = "chapter"
        elif in_notes:
            m = re.fullmatch(r"(\d{1,2})\.\s+(.+)", text)
            if m and int(m.group(1)) in CHAPTER_TITLES and m.group(2).isupper():
                chapter = f"Notes to Chapter {int(m.group(1))}: {CHAPTER_TITLES[int(m.group(1))]}"
                chapter_kind = "notes"
        mapping[idx] = (chapter, chapter_kind)
    return mapping


def load_notes(lines: list[str]) -> dict[tuple[int, int], str]:
    notes: dict[tuple[int, int], str] = {}
    chapter: int | None = None
    for idx in range(4497, min(6220, len(lines) + 1)):
        text = clean(lines[idx - 1])
        heading = re.fullmatch(r"(\d{1,2})\.\s+(.+)", text)
        if heading and int(heading.group(1)) in CHAPTER_TITLES and heading.group(2).isupper():
            chapter = int(heading.group(1))
            continue
        note = re.fullmatch(r"(\d{1,3})\.\s+(.+)", text)
        if chapter is not None and note:
            notes[(chapter, int(note.group(1)))] = note.group(2)
    return notes


def footnote_numbers(text: str) -> list[int]:
    # EPUB superscripts were flattened against the preceding token. Restrict to
    # 1-3 digits and require punctuation/letter immediately before the number.
    raw = re.findall(r"(?<=[A-Za-zÀ-ÖØ-öø-ÿ\)\]’”\.])(\d{1,3})(?=\s|$|[.,;:!?\)\]’”])", text)
    return sorted({int(n) for n in raw})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    lines = args.source.read_text(encoding="utf-8").splitlines()
    sections = section_map(lines)
    notes = load_notes(lines)

    try:
        import spacy
    except ImportError as exc:
        raise SystemExit("spaCy is required on PYTHONPATH") from exc

    nlp = spacy.load("en_core_web_sm")
    nlp.max_length = 2_000_000

    paragraph_rows: list[dict[str, object]] = []
    texts: list[str] = []
    for line_no, raw in enumerate(lines, start=1):
        if not included_line(line_no):
            continue
        text = clean(raw)
        if not text:
            continue
        section, section_kind = sections[line_no]
        chapter_match = re.search(r"(?:Chapter|Notes to Chapter) (\d{1,2})", section)
        chapter_no = int(chapter_match.group(1)) if chapter_match else None
        nums = footnote_numbers(text) if section_kind == "chapter" else []
        note_texts = [notes.get((chapter_no, n), "") for n in nums] if chapter_no else []
        paragraph_rows.append(
            {
                "paragraph_id": f"L{line_no:04d}",
                "source_line_start": line_no,
                "source_line_end": line_no,
                "section": section,
                "section_kind": section_kind,
                "chapter_number": chapter_no,
                "paragraph_text": text,
                "footnote_numbers": nums,
                "footnote_texts": note_texts,
            }
        )
        texts.append(text)

    by_candidate: dict[str, list[dict[str, object]]] = defaultdict(list)
    entity_labels: dict[str, Counter[str]] = defaultdict(Counter)

    for row, doc in zip(paragraph_rows, nlp.pipe(texts, batch_size=32)):
        seen: set[tuple[str, str, str]] = set()
        for ent in doc.ents:
            if ent.label_ not in {"GPE", "LOC", "FAC", "ORG", "EVENT", "NORP"}:
                continue
            name = clean(ent.text).strip(" ,.;:!?()[]{}‘’“”\"")
            if len(name) < 2:
                continue
            basis = f"ner:{ent.label_}"
            seen.add((name, basis, ent.label_))

        text = str(row["paragraph_text"])
        if SETTLEMENT_TERMS.search(text):
            for pattern, basis in ((AFTER_TERM, "rule:after-term"), (BEFORE_TERM, "rule:before-term")):
                for match in pattern.finditer(text):
                    name = clean(match.group(1)).strip(" ,.;:!?()[]{}‘’“”\"")
                    if len(name) >= 2:
                        seen.add((name, basis, "RULE"))

        for name, basis, label in seen:
            entity_labels[name][label] += 1
            by_candidate[name].append(
                {
                    "paragraph_id": row["paragraph_id"],
                    "source_line_start": row["source_line_start"],
                    "section": row["section"],
                    "basis": basis,
                    "paragraph_text": row["paragraph_text"],
                }
            )

    with (args.output_dir / "paragraphs.json").open("w", encoding="utf-8") as handle:
        json.dump(paragraph_rows, handle, ensure_ascii=False, indent=2)

    with (args.output_dir / "candidates.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                name: {
                    "mentions": mentions,
                    "labels": dict(entity_labels[name]),
                }
                for name, mentions in sorted(by_candidate.items(), key=lambda item: item[0].casefold())
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )

    with (args.output_dir / "candidates.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["candidate", "mention_count", "labels", "first_line", "first_section", "first_context"],
        )
        writer.writeheader()
        for name, mentions in sorted(by_candidate.items(), key=lambda item: (-len(item[1]), item[0].casefold())):
            writer.writerow(
                {
                    "candidate": name,
                    "mention_count": len(mentions),
                    "labels": json.dumps(dict(entity_labels[name]), ensure_ascii=False, sort_keys=True),
                    "first_line": mentions[0]["source_line_start"],
                    "first_section": mentions[0]["section"],
                    "first_context": mentions[0]["paragraph_text"],
                }
            )

    print(
        json.dumps(
            {
                "paragraphs": len(paragraph_rows),
                "candidates": len(by_candidate),
                "notes": len(notes),
                "output_dir": str(args.output_dir),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
