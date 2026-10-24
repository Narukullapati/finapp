"""Parse bank statement text/CSV and detect recurring transactions."""
import re
import statistics
from datetime import date, datetime

LINE_RE = re.compile(
    r"^(\d{1,2}/\d{1,2}/\d{4})\s+(.+?)\s{2,}(-?[\d,]+\.\d{2})(?:\s+-?[\d,]+\.\d{2})?\s*$"
)
CSV_RE = re.compile(r"^(\d{1,2}/\d{1,2}/\d{4})\s*,\s*(.+?)\s*,\s*(-?[\d,]+\.?\d*)\s*$")

IGNORE_PATTERNS = (
    "BEGINNING BALANCE", "ENDING BALANCE", "RETURN OF POSTED CHECK",
    "TOTAL CREDITS", "TOTAL DEBITS",
)

# keyword -> (kind, category). kind: bill | income | skip
CATEGORY_RULES = [
    (("PAYROLL",), ("income", "salary")),
    (("ZELLE FROM",), ("income", "other")),
    (("MORTGAGE",), ("bill", "loan")),
    (("MMI", "PROSPER", "TCPRRETAIL", "TCP RETAIL", "SOFI", "AFFIRM", "LENDING"), ("bill", "loan")),
    (("APPLECARD", "APPLE CARD", "CITIBANK", "CITIXFR", "BEST BUY", "GSBANK",
      "CAPITAL ONE", "DISCOVER", "AMEX", "CHASE CARD"), ("bill", "credit_card")),
    (("GAS", "UTILITY", "UTILITIES", "FRONTIER", "ATT", "AT&T", "MOBILITY",
      "TECO", "INTERNET", "XFINITY", "SPECTRUM", "VERIZON", "T-MOBILE",
      "WATER", "ELECTRIC"), ("bill", "utility")),
    (("HOSTINGER", "GITHUB", "COGNITION", "GOOGLE", "PRIME", "NETFLIX",
      "SPOTIFY", "HULU", "ADOBE", "ICLOUD", "OPENAI", "CLAUDE"), ("bill", "subscription")),
    (("RENT",), ("bill", "rent_payment")),
    (("ZELLE TO", "XOOM", "INTERNAL", "TRANSFER"), ("skip", "other")),
]


def _parse_amount(s: str) -> float:
    return float(s.replace(",", ""))


def parse_transactions(text: str) -> list[dict]:
    """Extract (date, description, amount) rows from statement text."""
    txns: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        m = LINE_RE.match(line) or CSV_RE.match(line)
        if not m:
            continue
        try:
            d = datetime.strptime(m.group(1), "%m/%d/%Y").date()
        except ValueError:
            continue
        desc = re.sub(r"\s+", " ", m.group(2)).strip()
        if any(p in desc.upper() for p in IGNORE_PATTERNS):
            continue
        txns.append({"date": d, "desc": desc, "amount": _parse_amount(m.group(3))})
    return txns


def merchant_key(desc: str) -> str:
    """Normalize a transaction description into a stable merchant key."""
    d = desc.upper()
    zm = re.match(r"ZELLE PAYMENT (FROM|TO)\s+(.+?)(?:\s+FOR\b|\s+CONF#|$)", d)
    if zm:
        name = re.sub(r"[^A-Z .'-]", "", zm.group(2)).strip()
        return f"ZELLE {zm.group(1)} {name}"
    m = re.match(r"(.+?)\s+DES:", d)
    base = m.group(1) if m else re.split(
        r"\s{2,}|\s+ID:|\s+PURCHASE\b|\s+MOBILE\b|\s+WITHDRWL\b|\s+PMNT\b|\d{2}/\d{2}", d
    )[0]
    tokens = []
    for t in re.sub(r"[^A-Z0-9/&. -]", " ", base).split():
        t = re.sub(r"\d", "", t)          # strip digits inside tokens (PAYROLL5447 -> PAYROLL)
        t = t.strip("#*.-")
        if t and t not in {"DES", "WEB", "PPD", "TEL", "ACH", "ACHPAYMENT", "PMT"}:
            tokens.append(t)
    return " ".join(tokens[:4])


def _classify(key: str, desc: str) -> tuple[str, str]:
    text = f"{key} {desc.upper()}"
    for keywords, (kind, cat) in CATEGORY_RULES:
        if any(k in text for k in keywords):
            return kind, cat
    return "bill", "other"


def _nice_name(key: str) -> str:
    return key.title().replace("Att", "AT&T").replace("Mmi", "MMI").replace(
        "Tcprretailach", "TCP Retail").replace("Zelle", "Zelle")


def detect_recurring(txns: list[dict]) -> list[dict]:
    """Group transactions by merchant, drop retries, infer cadence."""
    groups: dict[str, list[dict]] = {}
    for t in txns:
        groups.setdefault(merchant_key(t["desc"]), []).append(t)

    suggestions = []
    for key, rows in groups.items():
        rows.sort(key=lambda r: r["date"])
        # dedupe retries: same amount within 10 days of the previous kept row
        kept: list[dict] = []
        for r in rows:
            if kept and abs(abs(r["amount"]) - abs(kept[-1]["amount"])) < 1.01 \
                    and (r["date"] - kept[-1]["date"]).days <= 10 \
                    and (r["amount"] < 0) == (kept[-1]["amount"] < 0):
                continue
            kept.append(r)
        if len(kept) < 2:
            continue

        kind, cat = _classify(key, kept[-1]["desc"])
        if kind == "income" and "HARIKRISHNA NARUKULLAPATI" in key:
            kind = "skip"  # self-transfer, not income

        amounts = [abs(r["amount"]) for r in kept]
        gaps = [(kept[i + 1]["date"] - kept[i]["date"]).days for i in range(len(kept) - 1)]
        med_gap = statistics.median(gaps) if gaps else 30
        span = (kept[-1]["date"] - kept[0]["date"]).days
        # same/next-day repeats across months = multiple accounts billed monthly;
        # a ~2-month gap usually means a missed statement month, not quarterly
        if med_gap <= 3 and span > 45:
            med_gap = 30
        elif 55 <= med_gap <= 75:
            med_gap = 30
        if med_gap < 10:
            recurrence = "weekly"
        elif med_gap < 20:
            recurrence = "biweekly"
        elif med_gap < 40:
            recurrence = "monthly"
        elif med_gap < 100:
            recurrence = "quarterly"
        else:
            recurrence = "yearly"

        suggestions.append({
            "merchant_key": key,
            "name": _nice_name(key),
            "kind": kind,
            "category": cat,
            "amount": round(statistics.median(amounts), 2),
            "currency": "USD",
            "recurrence": recurrence,
            "due_day": int(statistics.median([r["date"].day for r in kept])),
            "first_date": kept[0]["date"].isoformat(),
            "last_date": kept[-1]["date"].isoformat(),
            "count": len(kept),
            "median_gap_days": med_gap,
            "sample": kept[-1]["desc"][:80],
        })

    order = {"bill": 0, "income": 1, "skip": 2}
    suggestions.sort(key=lambda s: (order[s["kind"]], -s["amount"]))
    return suggestions
