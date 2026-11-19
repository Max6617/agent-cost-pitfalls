"""Print, as one JSON object, the two cited quantities no committed analysis output files:

- slot_spread.<dataset>: within the dsh:native arm, mean billed cost per execution slot
  (`position` in results/<dataset>/runs.jsonl, joined on task, arm and seed with costBilled in
  analysis/cost-panel-6model-2026-10-03.json), dearest slot over cheapest. The same measurement
  as notes/defects/DEFECT-position-confound-2026-10-04.md section 2.
- order_effect: of the counterbalanced re-run rows in analysis/rerun-compare-2026-10-11.json,
  how many there are and how many order-effect 95% intervals exclude zero.
- r1_adjusted: replication criterion R1 on the order-adjusted (log) classifications filed in
  rerun-compare: of the providers in both suites, how many keep their batch-1 classification on
  tasks-b.
- cold_cheaper: of the batch-1 models in analysis/prefix-retention.json, how many have a
  negative cold-cache cost difference (code mode cheaper when priced without cache accounting).
- gateway_usd.<dataset>: billed USD summed over a batch-1 gateway log, skipping records the
  gateway could not price (cost null) and, for luna, records at or after the sign-off cut-off
  that tools/study-window.mjs declares (2026-10-04T06:01:57Z, a runaway process).
- rerun_gateway_usd: billed USD over every gateway log of the counterbalanced re-run, the spend
  its $70 stop counted (notes/plans/RERUN-PLAN.md): the ten matrices of artifact/MANIFEST.json
  `matrices` (rerun-b1, rerun-b, rerun-aa), the two smoke matrices (rerun-smoke, rerun-aa-smoke)
  and the two A/A smoke attempts that stopped at their pilot.

    python3 paper-numbers/derived.py
"""

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PANEL = "analysis/cost-panel-6model-2026-10-03.json"
RERUN = "analysis/rerun-compare-2026-10-11.json"
PREFIX = "analysis/prefix-retention.json"
ARM = "dsh:native"
GATEWAYS = {
    "luna-full": ("results/cmure98qw-openai-gateway.jsonl", "2026-10-04T06:01:57+00:00"),
    "ds-full": ("results/cmuquohyu-deepseek-gateway.jsonl", None),
}
RERUN_LOGS = [f"results/{m}-gateway.jsonl" for m in (
    "cmv2ypvsm-deepseek", "cmv2yw6al-deepseek", "cmv2z1xi6-deepseek", "cmv2z7zqa-deepseek",
    "cmv2zdnws-deepseek", "cmv3193um-zai", "cmv34e935-qwen", "cmv37rgsb-openai",
    "cmv45au5r-anthropic", "cmv39t2ww-deepseek", "cmv3efryx-zai", "cmv3my0fu-qwen",
    "cmv3z5ym5-openai", "cmv42rii8-deepseek")]


def gateway_usd(path: str, cutoff: str | None) -> float:
    end = datetime.fromisoformat(cutoff) if cutoff else None
    total = 0.0
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if end and datetime.fromisoformat(r["ts"].replace("Z", "+00:00")) >= end:
            continue
        usd = (r.get("cost") or {}).get("billedUsd")
        if usd is not None:
            total += usd
    return total


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def slot_spread(panel: list, dataset: str) -> float:
    cost = {(c["task"], c["arm"], c["seed"]): c["costBilled"]
            for c in panel if c["dataset"] == dataset and c["arm"] == ARM}
    by_slot = defaultdict(list)
    for line in Path(f"results/{dataset}/runs.jsonl").read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        key = (r["task"], r["arm"], r["seed"])
        if key in cost:
            by_slot[r["position"]].append(cost[key])
    means = [sum(v) / len(v) for v in by_slot.values()]
    return max(means) / min(means)


def main() -> None:
    panel = read_json(PANEL)["panel"]
    datasets = sorted({c["dataset"] for c in panel})
    rows = [r for suite in read_json(RERUN)["suites"].values() if isinstance(suite, list)
            for r in suite if "orderEffect" in r]
    excluding = [r for r in rows
                 if r["orderEffect"]["ciLoPct"] > 0 or r["orderEffect"]["ciHiPct"] < 0]
    suites = read_json(RERUN)["suites"]
    b1 = {r["model"]: r["filedAdjustedLog"]["cls"] for r in suites["rerun-b1"]}
    tb = {r["model"]: r["filedAdjustedLog"]["cls"] for r in suites["rerun-b"]}
    both = sorted(b1.keys() & tb.keys())
    print(json.dumps({
        "r1_adjusted": {"providers": len(both), "matches": sum(b1[m] == tb[m] for m in both)},
        "slot_spread": {d: slot_spread(panel, d) for d in datasets},
        "order_effect": {"rows": len(rows), "rows_excluding_zero": len(excluding)},
        "cold_cheaper": sum(p["coldDiffPct"] < 0 for p in read_json(PREFIX)["paired"]),
        "gateway_usd": {d: gateway_usd(*g) for d, g in GATEWAYS.items()},
        "rerun_gateway_usd": sum(gateway_usd(p, None) for p in RERUN_LOGS),
    }, indent=1))


if __name__ == "__main__":
    main()
