"""Print, as one JSON object, the quantities the paper cites for one results stem.

    python3 paper-numbers/extract.py paper-numbers/map/<fragment>.json <stem>

A map fragment is {stem: {key: spec}}. A spec names one committed file and how to read one
value from it; nothing is typed in by hand:

    {"from": "analysis/x.json", "path": ["sections", "A2", 4, "relPct"]}          the value
    {"from": "analysis/x.json", "path": [...], "op": "len"}                      its length
    {"from": "analysis/x.json", "path": [...], "op": "sum", "field": ["cost"]}   sum over items
    {"from": "results/m/runs.jsonl", "op": "count", "where": {"solved": true}}   JSONL records
    {"from": "results/m/runs.jsonl", "op": "sum", "field": ["usage", "input"]}   JSONL sum

A source listed in artifact/MANIFEST.json must still have the sha256 recorded there, so a value
is only ever copied from the checksummed v1.0 artifact. Run through `paper-numbers/build.sh`,
which records the provenance with `osaudit run`.
"""

import hashlib
import json
import sys
from pathlib import Path

MANIFEST = Path("artifact/MANIFEST.json")


def pinned() -> dict[str, str]:
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {e["path"]: e["sha256"] for e in m["inputs"] + m["outputs"]}


def load(path: str, sums: dict[str, str]):
    raw = Path(path).read_bytes()
    if path in sums and hashlib.sha256(raw).hexdigest() != sums[path]:
        raise SystemExit(f"{path}: sha256 differs from artifact/MANIFEST.json")
    text = raw.decode("utf-8")
    if path.endswith(".jsonl"):
        return [json.loads(line) for line in text.splitlines() if line.strip()]
    return json.loads(text)


def walk(doc, path):
    for k in path:
        doc = doc[k]
    return doc


def matches(record, where: dict) -> bool:
    return all(walk(record, k.split(".")) == v for k, v in where.items())


def value(spec: dict, cache: dict, sums: dict[str, str]):
    src = spec["from"]
    if src not in cache:
        cache[src] = load(src, sums)
    node = walk(cache[src], spec.get("path", []))
    op = spec.get("op", "get")
    if op == "get":
        return node
    items = list(node.values()) if isinstance(node, dict) else node
    items = [r for r in items if matches(r, spec.get("where", {}))]
    if op in ("len", "count"):
        return len(items)
    if op == "sum":
        return sum(walk(r, spec["field"]) for r in items)
    raise SystemExit(f"unknown op {op!r}")


def main() -> None:
    fragment, stem = sys.argv[1], sys.argv[2]
    specs = json.loads(Path(fragment).read_text(encoding="utf-8"))[stem]
    sums, cache = pinned(), {}
    print(json.dumps({key: value(spec, cache, sums) for key, spec in specs.items()}, indent=1))


if __name__ == "__main__":
    main()
