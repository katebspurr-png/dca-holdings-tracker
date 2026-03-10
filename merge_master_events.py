import re


def clean_event_name(name: str) -> str:
    """Strip noisy prefixes/suffixes from event titles."""
    # Strip ticket count prefixes like "4 TIX LEFT! ", "8 TICKETS LEFT! "
    name = re.sub(r'^\d+\s+TIX(?:KETS)?\s+LEFT!\s*', '', name)
    # Strip sold out prefixes: "SOLD OUT: ", "SOLD OUT! ", "SOLD OUT "
    name = re.sub(r'^SOLD\s+OUT[:\s!]*\s*', '', name)
    # Strip waitlist suffixes like " - Waitlist"
    name = re.sub(r'\s*-\s*Waitlist\s*$', '', name, flags=re.IGNORECASE)
    # Strip waitlist prefixes like "Waitlist: "
    name = re.sub(r'^Waitlist:\s*', '', name, flags=re.IGNORECASE)
    return name.strip()


def is_junk_event(name: str) -> bool:
    """Return True if the event title is junk and should be skipped."""
    if not name:
        return True
    upper = name.upper()
    # Closed / closing notices
    if re.search(r'CLOSED?\s', upper) or 'CLOSING' in upper:
        return True
    # "OPEN Regular Hours" notices
    if 'OPEN REGULAR HOURS' in upper:
        return True
    # STAFF EVENT mentions
    if 'STAFF EVENT' in upper:
        return True
    # Untitled event
    if upper == 'UNTITLED EVENT':
        return True
    # Watch Video (scraper button text)
    if upper == 'WATCH VIDEO':
        return True
    # Titles that are just "Activities" or "Private Event"
    if name.strip() in ('Activities', 'Private Event'):
        return True
    # Titles starting with "PO Box"
    if name.strip().upper().startswith('PO BOX'):
        return True
    return False


def normalize_row_for_master(row: dict) -> dict:
    """Normalize a row before inserting into master CSV."""
    if row.get("Event Name"):
        row["Event Name"] = clean_event_name(row["Event Name"])
    return row


def merge_all_events(rows: list[dict]) -> list[dict]:
    """Merge all event rows into a master list, filtering junk."""
    master = []
    for row in rows:
        if not row.get("Event Name"):
            continue
        if is_junk_event(row["Event Name"]):
            continue
        row = normalize_row_for_master(row)
        master.append(row)
    return master
