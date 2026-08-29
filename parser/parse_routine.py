import json
import re
import sys
from pathlib import Path

import pdfplumber

TIME_SLOTS = [
    ("08:30", "10:00"),
    ("10:00", "11:30"),
    ("11:30", "13:00"),
    ("13:00", "14:30"),
    ("14:30", "16:00"),
    ("16:00", "17:30"),
]

DAYS = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
COURSE_RE = re.compile(r"^([A-Z]{2,5}\d{3,4})\((.+)\)$")


def clean(value):
    if value is None:
        return ""
    value = str(value).replace("\u00ad", "")
    return re.sub(r"\s+", " ", value).strip()


def normalize_course(raw):
    raw = clean(raw)
    match = COURSE_RE.match(raw)
    if not match:
        return None
    return match.group(1), match.group(2).strip()


def detect_day_rows(rows):
    found = {}
    for index, row in enumerate(rows):
        joined = " ".join(clean(x) for x in row[:3] if x)
        for day in DAYS:
            if day in joined:
                found[index] = day
                break
    return found


def parse(pdf_path):
    events = []
    metadata = {"title": "", "version": "", "effective_from": ""}
    current_day = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""

            if page_no == 1:
                metadata["title"] = "Class Routine for CSE Program"
                version = re.search(r"Version\s+([^\s]+)", text)
                effective = re.search(r"Effective From:\s*(.*?)(?:Prepared by:|$)", text)
                if version:
                    metadata["version"] = version.group(1)
                if effective:
                    metadata["effective_from"] = clean(effective.group(1))

            tables = page.extract_tables()
            if not tables:
                continue

            rows = tables[0]
            day_rows = detect_day_rows(rows)

            for row_index, row in enumerate(rows):
                if row_index in day_rows:
                    current_day = day_rows[row_index]
                    continue

                if not current_day or len(row) < 18:
                    continue

                # Header rows are repeated in some pages.
                if any(clean(x) == "Room" for x in row if x):
                    continue

                for slot in range(6):
                    room = clean(row[slot * 3])
                    course_raw = clean(row[slot * 3 + 1])
                    teacher = clean(row[slot * 3 + 2])
                    parsed = normalize_course(course_raw)
                    if not parsed or not room:
                        continue

                    course, section = parsed
                    start, end = TIME_SLOTS[slot]
                    events.append({
                        "day": current_day,
                        "start": start,
                        "end": end,
                        "course": course,
                        "section": section,
                        "teacher": teacher,
                        "room": room,
                        "page": page_no,
                    })

    # Sort by class identity first so consecutive lab slots can be merged.
    events.sort(key=lambda e: (
        DAYS.index(e["day"]), e["room"], e["course"], e["section"], e["teacher"], e["start"]
    ))

    merged = []
    for event in events:
        if merged:
            previous = merged[-1]
            same_class = (
                previous["day"] == event["day"]
                and previous["course"] == event["course"]
                and previous["section"] == event["section"]
                and previous["teacher"] == event["teacher"]
                and previous["room"] == event["room"]
                and previous["end"] == event["start"]
            )
            if same_class:
                previous["end"] = event["end"]
                continue
        merged.append(event.copy())

    for event in merged:
        event.pop("page", None)

    # Final display order: day -> start time -> room -> course.
    merged.sort(key=lambda e: (
        DAYS.index(e["day"]), e["start"], e["room"], e["course"], e["section"]
    ))

    return {
        "metadata": metadata,
        "days": DAYS,
        "time_slots": [{"start": start, "end": end} for start, end in TIME_SLOTS],
        "sections": sorted({e["section"] for e in merged}),
        "courses": sorted({e["course"] for e in merged}),
        "events": merged,
    }


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python parser/parse_routine.py routine.pdf docs/data.json")

    data = parse(sys.argv[1])
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Parsed {len(data['events'])} classes")
    print(f"Found {len(data['sections'])} sections and {len(data['courses'])} courses")


if __name__ == "__main__":
    main()
