import hashlib
import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from pathlib import Path

import pyarrow.parquet as pq
from huggingface_hub import HfApi, hf_hub_download
from tokenizers import Tokenizer as HfTokenizer

sys.path.insert(0, str(Path("tokenizer-hub").resolve()))
from backend.app.tokenizer_registry import (
    TokenizerSpec,
    TiktokenBackendTokenizer,
    HfBackendTokenizer,
    HfTiktokenBackendTokenizer,
)
from nedotokenizer import SurfaceTokenizer

TARGET_BYTES = 1_000_000_000
BATCH_TARGET_BYTES = 4_000_000
BATCH_MAX_DOCS = 256
DATASET_ID = "hasankursun/turkish-corpus-100b"
QWEN_ID = "Qwen/Qwen3.8-27B"


def git_head(path: str) -> str:
    return subprocess.check_output(["git", "-C", path, "rev-parse", "HEAD"], text=True).strip()


def valid_utf8_prefix_and_fill(raw: bytes, target: int) -> bytes:
    cut = raw[:target]
    while True:
        try:
            cut.decode("utf-8")
            break
        except UnicodeDecodeError as exc:
            cut = cut[:exc.start]
    if len(cut) < target:
        cut += b" " * (target - len(cut))
    assert len(cut) == target
    return cut


api = HfApi()
dataset_revision = api.dataset_info(DATASET_ID).sha
qwen_revision = api.model_info(QWEN_ID).sha
repo_files = api.list_repo_files(DATASET_ID, repo_type="dataset", revision=dataset_revision)
shards = sorted(
    f for f in repo_files
    if f.startswith("pretrain/train-") and f.endswith(".parquet")
)
if not shards:
    raise RuntimeError("No TC-100B pretrain parquet shards found")

qwen_file = hf_hub_download(
    repo_id=QWEN_ID,
    filename="tokenizer.json",
    revision=qwen_revision,
    local_dir="/tmp/qwen38",
)

root = Path("tokenizer-hub/backend/tokenizers")
nedo = SurfaceTokenizer(Path("nedo/assets/surface-vocab.bin").read_bytes())
gpt_backend = TiktokenBackendTokenizer(TokenizerSpec(
    key="tiktoken:o200k_base", type="tiktoken", label="GPT-5 o200k_base", encoding="o200k_base"
))
deepseek_backend = HfBackendTokenizer(TokenizerSpec(
    key="hf:deepseek-v4-flash-0731", type="hf", label="DeepSeek V4", asset="deepseek-v4-flash-0731"
), root)
gemma_backend = HfBackendTokenizer(TokenizerSpec(
    key="hf:gemma4", type="hf", label="Gemma 4", asset="gemma4"
), root)
minimax_backend = HfBackendTokenizer(TokenizerSpec(
    key="hf:minimax-m3", type="hf", label="MiniMax M3", asset="minimax-m3"
), root)
kimi_backend = HfTiktokenBackendTokenizer(TokenizerSpec(
    key="hf_tiktoken:kimi-k3", type="hf_tiktoken", label="Kimi K3", asset="kimi-k3"
), root)
qwen_tok = HfTokenizer.from_file(qwen_file)

MODEL_NAMES = [
    "NedoTokenizer", "GPT-5 o200k", "Qwen 3.8", "Gemma 4",
    "DeepSeek V4", "MiniMax M3", "Kimi K3",
]
VOCABS = {
    "NedoTokenizer": 32000,
    "GPT-5 o200k": gpt_backend._encoding.n_vocab,
    "Qwen 3.8": qwen_tok.get_vocab_size(with_added_tokens=True),
    "Gemma 4": gemma_backend._tokenizer.get_vocab_size(with_added_tokens=True),
    "DeepSeek V4": deepseek_backend._tokenizer.get_vocab_size(with_added_tokens=True),
    "MiniMax M3": minimax_backend._tokenizer.get_vocab_size(with_added_tokens=True),
    "Kimi K3": kimi_backend._encoding.n_vocab,
}


def count_batch(texts: list[str]) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {}
    out["NedoTokenizer"] = [len(nedo.encode_ids(t.encode("utf-8"))) for t in texts]
    out["GPT-5 o200k"] = [
        len(x) for x in gpt_backend._encoding.encode_batch(
            texts, num_threads=2, allowed_special="all", disallowed_special=()
        )
    ]
    out["Qwen 3.8"] = [len(x.ids) for x in qwen_tok.encode_batch(texts, add_special_tokens=False)]
    out["Gemma 4"] = [len(x.ids) for x in gemma_backend._tokenizer.encode_batch(texts, add_special_tokens=False)]
    out["DeepSeek V4"] = [len(x.ids) for x in deepseek_backend._tokenizer.encode_batch(texts, add_special_tokens=False)]
    out["MiniMax M3"] = [len(x.ids) for x in minimax_backend._tokenizer.encode_batch(texts, add_special_tokens=False)]
    out["Kimi K3"] = [
        len(x) for x in kimi_backend._encoding.encode_batch(
            texts, num_threads=2, allowed_special="all", disallowed_special=()
        )
    ]
    return out


total_bytes = 0
total_chars = 0
total_docs = 0
model_tokens = {name: 0 for name in MODEL_NAMES}
source_stats = defaultdict(lambda: {
    "bytes": 0, "docs": 0, **{name: 0 for name in MODEL_NAMES}
})
payload_sha = hashlib.sha256()
structured_sha = hashlib.sha256()
shards_used: list[str] = []
start_time = time.time()
next_progress = 100_000_000

batch_texts: list[str] = []
batch_sources: list[str] = []
batch_raws: list[bytes] = []
batch_bytes = 0


def flush_batch() -> None:
    global batch_texts, batch_sources, batch_raws, batch_bytes, total_chars, total_docs
    if not batch_texts:
        return
    counts = count_batch(batch_texts)
    for i, (text, source, raw) in enumerate(zip(batch_texts, batch_sources, batch_raws)):
        nbytes = len(raw)
        total_chars += len(text)
        total_docs += 1
        payload_sha.update(raw)
        structured_sha.update(nbytes.to_bytes(8, "little"))
        structured_sha.update(raw)
        st = source_stats[source]
        st["bytes"] += nbytes
        st["docs"] += 1
        for name in MODEL_NAMES:
            n = counts[name][i]
            model_tokens[name] += n
            st[name] += n
    batch_texts = []
    batch_sources = []
    batch_raws = []
    batch_bytes = 0


done = False
for shard in shards:
    if done:
        break
    local_path = hf_hub_download(
        repo_id=DATASET_ID,
        repo_type="dataset",
        filename=shard,
        revision=dataset_revision,
        local_dir="/tmp/tc100b",
    )
    shards_used.append(shard)
    pf = pq.ParquetFile(local_path)
    available = set(pf.schema.names)
    cols = ["text"] + (["source"] if "source" in available else [])
    for record_batch in pf.iter_batches(batch_size=512, columns=cols):
        data = record_batch.to_pydict()
        texts = data["text"]
        sources = data.get("source") or ["unknown"] * len(texts)
        for text, source in zip(texts, sources):
            if total_bytes >= TARGET_BYTES:
                done = True
                break
            if text is None:
                continue
            text = str(text)
            source = str(source or "unknown")
            raw = text.encode("utf-8")
            remaining = TARGET_BYTES - total_bytes
            if len(raw) > remaining:
                raw = valid_utf8_prefix_and_fill(raw, remaining)
                text = raw.decode("utf-8")
                done = True
            if not raw:
                if done:
                    break
                continue
            batch_texts.append(text)
            batch_sources.append(source)
            batch_raws.append(raw)
            batch_bytes += len(raw)
            total_bytes += len(raw)
            if batch_bytes >= BATCH_TARGET_BYTES or len(batch_texts) >= BATCH_MAX_DOCS or done:
                flush_batch()
                if total_bytes >= next_progress or done:
                    elapsed = time.time() - start_time
                    print(f"PROGRESS bytes={total_bytes} docs={total_docs} elapsed_s={elapsed:.1f}", flush=True)
                    while next_progress <= total_bytes:
                        next_progress += 100_000_000
            if done:
                break
        if done:
            break
    if done:
        break

flush_batch()
assert total_bytes == TARGET_BYTES, (total_bytes, TARGET_BYTES)

summary = []
for name in MODEL_NAMES:
    tokens = model_tokens[name]
    summary.append({
        "model": name,
        "tokens": tokens,
        "vocab_size": int(VOCABS[name]),
        "bytes_per_token": TARGET_BYTES / tokens,
        "tokens_per_kb": tokens / (TARGET_BYTES / 1000.0),
        "embedding_params_d4096_m": VOCABS[name] * 4096 / 1e6,
    })
summary.sort(key=lambda x: x["tokens"])

source_rows = []
for source, st in source_stats.items():
    row = {"source": source, "bytes": st["bytes"], "docs": st["docs"]}
    for name in MODEL_NAMES:
        row[name] = st[name]
        row[f"{name}_bpt"] = st["bytes"] / st[name] if st[name] else None
    source_rows.append(row)
source_rows.sort(key=lambda x: x["bytes"], reverse=True)

result = {
    "benchmark": {
        "dataset": DATASET_ID,
        "dataset_revision": dataset_revision,
        "sampling": "sorted pretrain/train-*.parquet; document order preserved; first 1,000,000,000 UTF-8 text bytes; document boundaries preserved for tokenization",
        "target_bytes": TARGET_BYTES,
        "actual_bytes": total_bytes,
        "documents": total_docs,
        "characters": total_chars,
        "payload_sha256": payload_sha.hexdigest(),
        "structured_sha256": structured_sha.hexdigest(),
        "shards_used": shards_used,
        "nedo_git_commit": git_head("nedo"),
        "tokenizer_hub_git_commit": git_head("tokenizer-hub"),
        "qwen_repo": QWEN_ID,
        "qwen_revision": qwen_revision,
        "elapsed_seconds": time.time() - start_time,
    },
    "summary": summary,
    "source_breakdown": source_rows,
}

Path("benchmark_1gb_results.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
)

print("RESULT_JSON_START")
print(json.dumps({
    "benchmark": result["benchmark"],
    "summary": summary,
    "top_sources": source_rows[:20],
}, ensure_ascii=False))
print("RESULT_JSON_END")
