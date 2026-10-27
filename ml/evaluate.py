"""Evaluation: stratified 5-fold CV — TabPFN vs LogisticRegression vs
HistGradientBoosting. Writes data/eval-results.json consumed by /science.

Run: python -m ml.evaluate
"""
import json
import time
import datetime as dt
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss
from sklearn.calibration import CalibratedClassifierCV

from .features import FEATURE_KEYS

DATA = Path(__file__).parent.parent / "data"


def load_xy():
    rows = json.loads((DATA / "dataset.json").read_text())["rows"]
    X = np.array([[r["features"][k] for k in FEATURE_KEYS] for r in rows], dtype=float)
    y = np.array([r["label"] for r in rows], dtype=int)
    return X, y


def cv_metrics(make_model, X, y, seed=7):
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    aucs, prs, briers, probs_all, y_all = [], [], [], [], []
    for tr, te in skf.split(X, y):
        m = make_model()
        m.fit(X[tr], y[tr])
        p = m.predict_proba(X[te])[:, 1]
        aucs.append(roc_auc_score(y[te], p))
        prs.append(average_precision_score(y[te], p))
        briers.append(brier_score_loss(y[te], p))
        probs_all.extend(p)
        y_all.extend(y[te])
    return {
        "rocAuc": round(float(np.mean(aucs)), 3),
        "prAuc": round(float(np.mean(prs)), 3),
        "brier": round(float(np.mean(briers)), 3),
        "_probs": probs_all,
        "_y": y_all,
    }


def tabpfn_model():
    try:
        from tabpfn import TabPFNClassifier  # noqa: WPS433
        return TabPFNClassifier(device="cpu")
    except Exception as e:  # noqa: BLE001
        print(f"TabPFN unavailable: {e}")
        return None


def main():
    X, y = load_xy()
    print(f"dataset: {X.shape}, positives={y.mean():.2%}")
    results = []

    t0 = time.time()
    tf = tabpfn_model()
    if tf is not None:
        r = cv_metrics(lambda: tabpfn_model(), X, y)
        r["name"] = "TabPFN"
        r["notes"] = f"{time.time()-t0:.0f}s total, zero hyperparameter tuning"
        results.append(r)

    r = cv_metrics(lambda: CalibratedClassifierCV(LogisticRegression(max_iter=2000)), X, y)
    r["name"] = "LogisticRegression (calibrated)"
    results.append(r)

    r = cv_metrics(lambda: HistGradientBoostingClassifier(max_iter=300), X, y)
    r["name"] = "HistGradientBoosting"
    results.append(r)

    out = {
        "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
        "datasetSize": int(len(y)),
        "positiveRate": round(float(y.mean()), 4),
        "features": FEATURE_KEYS,
        "folds": 5,
        "models": [{k: v for k, v in m.items() if not k.startswith("_")} for m in results],
        "calibrationCurve": {
            m["name"]: {"prob": m["_probs"][:: max(1, len(m["_probs"]) // 50)], "y": m["_y"][:: max(1, len(m["_y"]) // 50)]}
            for m in results
        },
        "limitations": [
            "Label approximated from last push before T0 — branch pushes on non-default branches add noise.",
            "Issue/PR response features dropped in the reduced build (disclosed).",
            "Popularity-tier sampling over-represents well-known projects vs the true ecosystem.",
            "A high score is a signal to investigate, never a verdict on a maintainer.",
        ],
    }
    (DATA / "eval-results.json").write_text(json.dumps(out, indent=1))
    for m in out["models"]:
        print(f"{m['name']}: AUC={m['rocAuc']} PR={m['prAuc']} Brier={m['brier']}")

    # persist final model for serving
    if tf is not None:
        import joblib
        final = tabpfn_model()
        final.fit(X, y)
        Path(DATA.parent / "ml" / "model").mkdir(exist_ok=True)
        joblib.dump(final, DATA.parent / "ml" / "model" / "ghost-tabpfn.joblib")
        print("saved ml/model/ghost-tabpfn.joblib")


if __name__ == "__main__":
    main()
