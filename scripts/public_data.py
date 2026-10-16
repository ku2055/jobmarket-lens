"""Explicit publication boundary. Descriptions and matched source text stay private."""
PUBLIC_POSTING_FIELDS = (
    "id", "co", "title", "url", "posted", "year", "month", "open", "soc", "sched", "arr", "deg",
    "deg_equiv", "yrs", "yrs_b", "lvl", "pay_min", "pay_max", "pay_lo", "pay_hi", "pay_period", "pay_cur",
    "country", "state", "city", "nloc", "src", "first_seen", "last_seen", "status", "date_basis",
    "future_date", "locations", "pay_flags", "pay_valid", "has_text",
)
PUBLIC_SNAPSHOT_FIELDS = (
    "run_date", "company", "status", "collected", "site_total", "completeness",
)


def public_snapshot(snapshot):
    return {key: snapshot[key] for key in PUBLIC_SNAPSHOT_FIELDS if key in snapshot}
