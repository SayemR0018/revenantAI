"""Sample from the trained epitaph LoRA via Tinker's sampling client."""
import os
import json
from pathlib import Path

DATA = Path(__file__).parent.parent.parent / "data"


def sample(prompt: str, checkpoint: str | None, max_tokens: int = 300) -> str:
    import tinker
    from tinker import types
    from tinker_cookbook.tokenizer_utils import get_tokenizer

    ckpt = checkpoint or (DATA / "tinker-checkpoint.txt").read_text().strip()
    model = os.environ.get("TINKER_BASE_MODEL", "Qwen/Qwen3-8B")
    tok = get_tokenizer(model)
    sc = tinker.ServiceClient()
    sc_client = sc.create_sampling_client(base_model=model, model_path=ckpt)
    out = sc_client.sample(
        prompt=types.ModelInput.from_ints(tok.encode(prompt + "\n")),
        num_samples=1,
        sampling_params=types.SamplingParams(max_tokens=max_tokens, temperature=0.3, stop=["\n\n"]),
    ).result()
    text = "".join(tok.decode([t]) for t in out.sequences[0].tokens)
    return text
