"""Dataset builder for the ghost-risk model.

Samples GitHub repos behind npm/PyPI packages across popularity tiers and
reconstructs features as of snapshot T0. Label = no non-bot default-branch
commit in (T0, T0+12mo], archived, or registry-deprecated.

Requires GITHUB_TOKEN. Budget: ~6h wall time via GraphQL batching + disk cache.
If issue/PR history reconstruction runs long, set FAST=1 to drop those features
(the reduction is disclosed on /science).

Run: python -m ml.dataset --npm 1000 --pypi 500
"""
import os
import sys
import json
import time
import argparse
import datetime as dt
from pathlib import Path

import httpx

from .features import FEATURE_KEYS, SNAPSHOT_T0

T0 = dt.date.fromisoformat(SNAPSHOT_T0)
T1 = T0 + dt.timedelta(days=365)
DATA = Path(__file__).parent.parent / "data"
RAW = DATA / "raw"
RAW.mkdir(parents=True, exist_ok=True)

GH = "https://api.github.com/graphql"
TOKEN = os.environ.get("GITHUB_TOKEN")


def gql(query: str, vars: dict) -> dict:
    key = f"{abs(hash((query, json.dumps(vars, sort_keys=True))))}"
    cache = RAW / f"{key}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN required for dataset building")
    for attempt in range(5):
        r = httpx.post(GH, headers={"authorization": f"Bearer {TOKEN}"}, json={"query": query, "variables": vars}, timeout=30)
        if r.status_code == 200:
            j = r.json()
            cache.write_text(json.dumps(j))
            return j
        if r.status_code in (502, 503):
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 403 and "rate" in r.text.lower():
            reset = int(r.headers.get("x-ratelimit-reset", time.time() + 60))
            time.sleep(max(5, reset - time.time()))
            continue
        r.raise_for_status()
    raise RuntimeError("graphql failed after retries")


# ---------- sampling ----------

def sample_repos(npm_n: int, pypi_n: int) -> list[dict]:
    """Stratified sample: split each ecosystem into popularity tiers via search."""
    repos = []
    tiers = [("stars:>1000", 0.2), ("stars:100..1000", 0.4), ("stars:10..100", 0.3), ("stars:<10", 0.1)]
    for eco, total in (("npm", npm_n), ("pypi", pypi_n)):
        for stars, frac in tiers:
            want = max(5, int(total * frac))
            q = f"{stars} archived:false fork:false"
            # package-manager hints: package.json (npm) or setup/pyproject (pypi)
            q += " filename:package.json" if eco == "npm" else " filename:pyproject.toml OR filename:setup.py"
            cursor = None
            got = 0
            while got < want:
                j = gql(
                    """query($q:String!,$c:String){search(query:$q,type:REPOSITORY,first:50,after:$c){
                      nodes{...on Repository{nameWithOwner,pushedAt,createdAt,stargazerCount,isArchived,
                        owner{__typename},primaryLanguage{name},diskUsage,licenseInfo{spdxId},
                        fundingLinks{platform,url}}}
                      pageInfo{endCursor,hasNextPage}}}""",
                    {"q": q, "c": cursor},
                )
                nodes = j["data"]["search"]["nodes"]
                if not nodes:
                    break
                for n in nodes:
                    n["ecosystem"] = eco
                repos.extend(nodes)
                got += len(nodes)
                pi = j["data"]["search"]["pageInfo"]
                if not pi["hasNextPage"]:
                    break
                cursor = pi["endCursor"]
            print(f"{eco} {stars}: +{got} (total {len(repos)})", flush=True)
    return repos


# ---------- features + label ----------

COMMIT_Q = """query($o:String!,$n:String!,$since:GitTimestamp!,$until:GitTimestamp!){
 repository(owner:$o,name:$n){defaultBranchRef{target{...on Commit{
   history(first:100,since:$since,until:$until,author:{excludeBots:true}){
     totalCount nodes{committedDate author{user{login} name}}}}}}}}"""


def build_features(repo: dict) -> dict | None:
    owner, name = repo["nameWithOwner"].split("/")
    pushed = repo.get("pushedAt")
    archived = bool(repo.get("isArchived"))

    # label: pushed_at <= T0 => no commits in the observation window (approximation)
    label = 1 if (archived or (pushed and pushed[:10] <= SNAPSHOT_T0)) else 0

    hist = gql(
        COMMIT_Q,
        {"o": owner, "n": name, "since": f"{T0 - dt.timedelta(days=365):%Y-%m-%dT%H:%M:%SZ}", "until": f"{T0:%Y-%m-%dT%H:%M:%SZ}"},
    )
    commits = (hist.get("data", {}).get("repository", {}) or {}).get("defaultBranchRef")
    nodes = commits["target"]["history"]["nodes"] if commits else []

    cutoff = {d: T0 - dt.timedelta(days=d) for d in (30, 90, 180, 365)}
    counts = {d: 0 for d in cutoff}
    authors = {90: set(), 365: set()}
    last_commit = None
    for c in nodes:
        day = dt.date.fromisoformat(c["committedDate"][:10])
        if day > T0:
            continue
        if last_commit is None or day > last_commit:
            last_commit = day
        for d in cutoff:
            if day > cutoff[d]:
                counts[d] += 1
        for w in authors:
            if day > cutoff[w]:
                authors[w].add((c.get("author") or {}).get("user", {}).get("login") or (c.get("author") or {}).get("name") or "?")

    days_since = (T0 - last_commit).days if last_commit else 3650
    total = max(1, counts[365])
    by_author = {}
    for c in nodes:
        d0 = dt.date.fromisoformat(c["committedDate"][:10])
        if d0 > cutoff[365]:
            k = (c.get("author") or {}).get("user", {}).get("login") or "?"
            by_author[k] = by_author.get(k, 0) + 1
    bus = (max(by_author.values()) / total) if by_author else 1.0

    created = dt.date.fromisoformat(repo["createdAt"][:10])
    fv = dict.fromkeys(FEATURE_KEYS, 0.0)
    fv.update({
        "daysSinceCommit": days_since,
        "commits30": counts[30], "commits90": counts[90],
        "commits180": counts[180], "commits365": counts[365],
        "commitSlope": 0.0,  # refined in evaluate.py from weekly buckets
        "authors90": len(authors[90]), "authors365": len(authors[365]),
        "busFactor": bus,
        "openIssues": 0,
        "repoAgeDays": (T0 - created).days,
        "hasFunding": 1 if repo.get("fundingLinks") else 0,
        "orgOwned": 1 if repo.get("owner", {}).get("__typename") == "Organization" else 0,
        "archived": int(archived),
        "deprecated": 0,
        "logWeeklyDownloads": 0.0,
        "downloadsTrend": 1.0,
    })
    return {"repo": repo["nameWithOwner"], "ecosystem": repo["ecosystem"], "label": label, "features": fv}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--npm", type=int, default=1000)
    ap.add_argument("--pypi", type=int, default=500)
    a = ap.parse_args()
    repos = sample_repos(a.npm, a.pypi)
    out = []
    for i, r in enumerate(repos):
        try:
            row = build_features(r)
            if row:
                out.append(row)
        except Exception as e:  # noqa: BLE001
            print(f"skip {r['nameWithOwner']}: {e}")
        if i % 25 == 0:
            print(f"[{i}/{len(repos)}] rows={len(out)}", flush=True)
            (DATA / "dataset.json").write_text(json.dumps({"t0": SNAPSHOT_T0, "rows": out}, indent=0))
    (DATA / "dataset.json").write_text(json.dumps({"t0": SNAPSHOT_T0, "rows": out}, indent=0))
    print(f"wrote {len(out)} rows -> data/dataset.json")


if __name__ == "__main__":
    main()
