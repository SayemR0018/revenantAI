"""Build the epitaph SFT dataset: (structured evidence JSON) -> (strict JSON).

Targets are drafted by an open-weight Gemma model under a strict rubric, then
machine-filtered: schema valid, every claim cites an evidence id, no accusatory
language. 100 examples are held out for eval.

Run: python -m ml.tinker.dataset --n 800
"""
import json
import os
import argparse
import random
import re
from pathlib import Path

DATA = Path(__file__).parent.parent.parent / "data"
OUT = DATA / "tinker-dataset.jsonl"
EVAL_OUT = DATA / "tinker-eval.jsonl"

BANNED = re.compile(r"\b(lazy|abandoned by|didn'?t care|negligent|blame|at fault|incompetent)\b", re.I)

RUBRIC = """Write an epitaph record for this project as strict JSON:
{"causeOfDeath": one of maintainer_burnout|superseded|archived_by_author|ecosystem_shift|company_pulled|deprecated_official|slow_decay|alive|unknown,
 "evidenceIds": [only ids present in the evidence],
 "epitaph": "max 2 sentences, warm, dignified; honors what the project gave; never blames or mocks maintainers"}
Rules: cite only given evidence ids; no invented facts; no accusatory language; "signals, not verdicts"."""


def evidence_pack(row: dict) -> dict:
    f = row["features"]
    evs = []
    if f.get("archived"):
        evs.append({"id": "ev_arch", "label": "Repository archived"})
    if f.get("deprecated"):
        evs.append({"id": "ev_dep", "label": "Registry deprecation notice"})
    evs.append({"id": "ev_commit", "label": f"Last commit {int(f.get('daysSinceCommit', 0))}d before snapshot"})
    if f.get("busFactor", 0) > 0.8:
        evs.append({"id": "ev_bus", "label": f"Top author wrote {f['busFactor']:.0%} of last-year commits"})
    return {"repo": row["repo"], "ecosystem": row["ecosystem"], "label": row["label"], "evidence": evs, "features": f}


def draft_with_gemma(prompt: str) -> str | None:
    key = os.environ.get("GOOGLE_API_KEY")
    if not key:
        return None
    import httpx
    r = httpx.post(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        headers={"authorization": f"Bearer {key}"},
        json={
            "model": os.environ.get("GEMMA_MODEL", "gemma-3-27b-it"),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def valid(target: dict, ev_ids: set[str]) -> bool:
    try:
        assert target["causeOfDeath"] in {
            "maintainer_burnout", "superseded", "archived_by_author", "ecosystem_shift",
            "company_pulled", "deprecated_official", "slow_decay", "alive", "unknown"}
        assert all(i in ev_ids for i in target["evidenceIds"])
        assert len(target["epitaph"]) <= 400 and not BANNED.search(target["epitaph"])
        return True
    except Exception:  # noqa: BLE001
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=800)
    ap.add_argument("--holdout", type=int, default=100)
    a = ap.parse_args()
    rows = json.loads((DATA / "dataset.json").read_text())["rows"]
    random.Random(11).shuffle(rows)
    rows = rows[: a.n + a.holdout]

    written = 0
    with OUT.open("w") as f, EVAL_OUT.open("w") as ef:
        for i, row in enumerate(rows):
            pack = evidence_pack(row)
            ev_ids = {e["id"] for e in pack["evidence"]}
            prompt = f"{RUBRIC}\n\nProject: {pack['repo']} ({pack['ecosystem']})\nEvidence: {json.dumps(pack['evidence'])}\nFeatures: {json.dumps({k: v for k, v in pack['features'].items() if v})}"
            raw = draft_with_gemma(prompt)
            if raw is None:
                print("GOOGLE_API_KEY unset — cannot draft targets. Set it and rerun.")
                return
            try:
                target = json.loads(raw.strip().removeprefix("```json").removesuffix("```"))
            except Exception:  # noqa: BLE001
                continue
            if not valid(target, ev_ids):
                continue
            rec = {"input": prompt, "output": json.dumps(target)}
            (ef if i >= a.n else f).write(json.dumps(rec) + "\n")
            written += 1
            if written % 50 == 0:
                print(f"{written} rows kept")
    print(f"done: {written} rows -> {OUT.name} (+ {EVAL_OUT.name} holdout)")


if __name__ == "__main__":
    main()
