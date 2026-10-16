"""Conservative collection quality: success is not proof of completeness."""


def collection_completeness(count, limit, stats):
    total = stats.get("site_total")
    if stats.get("duplicates") or stats.get("invalid_records"):
        return "partial"
    if total is not None and count != total:
        return "partial"
    if stats.get("exhausted") and total is not None and count == total:
        return "complete"
    if count >= limit:
        return "partial"
    return "unknown"
