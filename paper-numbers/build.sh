#!/usr/bin/env bash
# Regenerate paper-numbers/results/<stem>.json for every stem of every map fragment, each through
# `osaudit run`, which records the command, the sha256 of every input and the git commit.
# Run from the repository root with a clean tree; OSAUDIT_BIN overrides the osaudit on PATH.
set -euo pipefail
OSAUDIT=${OSAUDIT_BIN:-osaudit}
mkdir -p paper-numbers/results
for fragment in paper-numbers/map/*.json; do
  python3 - "$fragment" <<'PY' |
import json, sys
for stem, specs in json.load(open(sys.argv[1], encoding="utf-8")).items():
    print(stem, *sorted({s["from"] for s in specs.values()}))
PY
  while read -r stem sources; do
    inputs=(--input "$fragment" --input artifact/MANIFEST.json)
    for s in $sources; do inputs+=(--input "$s"); done
    "$OSAUDIT" run "${inputs[@]}" -o "paper-numbers/results/$stem.json" \
      -- python3 paper-numbers/extract.py "$fragment" "$stem"
  done
done
derived=(--input analysis/cost-panel-6model-2026-10-03.json --input analysis/rerun-compare-2026-10-11.json
  --input analysis/prefix-retention.json)
for d in ds-full glm-flash haiku-full luna-full qwen-full sonnet-full; do
  derived+=(--input "results/$d/runs.jsonl")
done
derived+=(--input results/cmure98qw-openai-gateway.jsonl --input results/cmuquohyu-deepseek-gateway.jsonl)
"$OSAUDIT" run "${derived[@]}" -o paper-numbers/results/derived.json -- python3 paper-numbers/derived.py
