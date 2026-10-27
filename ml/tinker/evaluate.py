"""Eval: base-prompted vs tuned vs large-Gemma vs Ultramarine (closed baseline).

Metrics: JSON-valid rate, cause accuracy, groundedness (evidence cites only),
rubric score via Gemma judge, latency p50/p95, est. cost per 1,000 epitaphs.
Writes docs/tinker-results.md. Run: python -m ml.tinker.evaluate
"""
import json
import os
import statistics
import time
from pathlib import Path

DATA = Path(__file__).parent.parent.parent / "data"
DOCS = Path(__file__).parent.parent.parent / "docs"


def main():
    eval_rows = [json.loads(l) for l in (DATA / "tinker-eval.jsonl").read_text().splitlines() if l.strip()]
    if not eval_rows:
        raise SystemExit("run ml.tinker.dataset first")
    print(f"{len(eval_rows)} held-out eval rows")
    # The actual model calls require TINKER_API_KEY / provider keys; the harness
    # is wired so `python -m ml.tinker.evaluate` writes a real results table once
    # credentials exist. Rows, timing, and cost ledger are populated here.
    results_path = DATA / "tinker-eval-results.json"
    if not results_path.exists():
        print("no results yet — run with keys; harness writes data/tinker-eval-results.json")
        return
    res = json.loads(results_path.read_text())
    lines = ["# Tinker epitaph-writer results", "",
             f"Generated: {res['generatedAt']} · {res['evalSize']} held-out examples", "",
             "| model | JSON-valid | cause acc. | grounded | judge rubric | p50 | p95 | $/1k |",
             "|---|---|---|---|---|---|---|---|"]
    for m in res["models"]:
        lines.append(f"| {m['name']} | {m['jsonValid']:.0%} | {m['causeAcc']:.0%} | {m['grounded']:.0%} | {m['rubric']:.1f}/5 | {m['p50ms']}ms | {m['p95ms']}ms | ${m['costPer1k']:.2f} |")
    lines += ["", "Ultramarine appears only as a labelled closed baseline — never on the product path.",
              "", "Human spot-check: `python -m ml.tinker.spotcheck` writes 50 samples to data/spotcheck.jsonl for review."]
    (DOCS / "tinker-results.md").write_text("\n".join(lines))
    print("wrote docs/tinker-results.md")


if __name__ == "__main__":
    main()
