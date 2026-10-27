"""LoRA SFT of a small open-weight model on the epitaph dataset via Tinker.

Run: python -m ml.tinker.train --model Qwen/Qwen3-8B --epochs 3
Requires TINKER_API_KEY. Docs: https://tinker-docs.thinkingmachines.ai
"""
import argparse
import json
import os
from pathlib import Path

DATA = Path(__file__).parent.parent.parent / "data"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=os.environ.get("TINKER_BASE_MODEL", "Qwen/Qwen3-8B"))
    ap.add_argument("--rank", type=int, default=32)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--lr", type=float, default=4e-5)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--name", default="revenant-epitaph-lora")
    a = ap.parse_args()

    if not os.environ.get("TINKER_API_KEY"):
        raise SystemExit("TINKER_API_KEY required")

    import tinker
    from tinker import types

    rows = [json.loads(l) for l in (DATA / "tinker-dataset.jsonl").read_text().splitlines() if l.strip()]
    print(f"{len(rows)} SFT rows, model={a.model} rank={a.rank}")

    sc = tinker.ServiceClient()
    tc = sc.create_lora_training_client(base_model=a.model, rank=a.rank)

    # tokenize with the model's own tokenizer via the cookbook helper
    from tinker_cookbook.tokenizer_utils import get_tokenizer
    tok = get_tokenizer(a.model)

    def to_datum(rec):
        prompt_ids = tok.encode(rec["input"] + "\n")
        target_ids = tok.encode(rec["output"])
        tokens = prompt_ids + target_ids
        # loss on target tokens only
        loss_mask = [0] * len(prompt_ids) + [1] * len(target_ids)
        return types.Datum(
            model_input=types.ModelInput.from_ints(tokens[:-1]),
            loss_fn_inputs={
                "target_tokens": types.TensorData(data=tokens[1:], dtype="int64", shape=[len(tokens) - 1]),
                "weights": types.TensorData(data=loss_mask[1:], dtype="float32", shape=[len(tokens) - 1]),
            },
        )

    data = [to_datum(r) for r in rows]
    for epoch in range(a.epochs):
        for i in range(0, len(data), a.batch):
            batch = data[i:i + a.batch]
            fb = tc.forward_backward(batch, loss_fn="cross_entropy")
            opt = tc.optim_step(types.AdamParams(learning_rate=a.lr))
            fb.result(); opt.result()
        print(f"epoch {epoch + 1} done", flush=True)

    # save + materialize a sampling client for serving
    fut = tc.save_weights_and_get_sampling_client(name=a.name)
    sampler = fut.result()
    print("saved:", getattr(sampler, "path", a.name))
    (DATA / "tinker-checkpoint.txt").write_text(getattr(sampler, "path", a.name))
    print("checkpoint name recorded in data/tinker-checkpoint.txt")
    print("export LoRA weights: tinker checkpoint download <path> — or see tinker_cookbook.weights.download")


if __name__ == "__main__":
    main()
