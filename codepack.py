#!/usr/bin/env python3
"""
codepack.py — Prepare repository source code to feed into an LLM.

Features:
- Recursively collects source files (allowlist of extensions)
- Skips noisy/binary directories (node_modules, build, .git, etc.)
- Masks common secrets (API keys, tokens, private keys) or excludes .env files
- Chunks long files into JSONL records for easier LLM ingestion
- Produces:
    out/
      code.jsonl          — one JSON object per chunk
      manifest.json       — summary of files, sizes, chunk map
      file_list.csv       — flat list of included files with stats
      prompt_user_ru.md   — ready prompt for analysis (RU)
      prompt_user_en.md   — ready prompt for analysis (EN)
      README.md           — how to use
Usage:
  python3 codepack.py --path /path/to/repo --out outdir --chunk-chars 8000 --max-file-chars 120000
"""
import argparse
import os
import re
import json
import csv
from pathlib import Path
from datetime import datetime

ALLOW_EXT = {
    ".py",".ipynb",".js",".jsx",".ts",".tsx",".json",".yml",".yaml",".toml",
    ".md",".rst",".ini",".cfg",".txt",".css",".scss",".sass",".html",".htm",
    ".vue",".svelte",".go",".rs",".java",".kt",".kts",".cs",".c",".cc",".cpp",
    ".h",".hpp",".sql",".graphql",".gql",".proto",".rb",".php",".sh",".bash",
    ".ps1",".dockerfile",".gradle",".make",".mk",".env.example",".conf",".pl",
}
SKIP_DIRS = {
    ".git",".hg",".svn","__pycache__","node_modules","dist","build",".next",".cache",
    ".mypy_cache",".pytest_cache",".venv","venv",".idea",".vscode",".ds_store",".turbo",
    ".terraform",".serverless",".docusaurus",".husky",".gitlab",".circleci",".yarn"
}
SKIP_FILES_EXACT = {
    ".env",".env.local",".env.production",".env.development",".env.test",".env.staging",
    "package-lock.json","pnpm-lock.yaml","yarn.lock","poetry.lock"
}
# Reasonable per-chunk char target
DEFAULT_CHUNK = 8000
DEFAULT_MAX_FILE = 120000

# Secret masking rules (quick heuristics)
SECRET_PATTERNS = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----", re.MULTILINE), "<REDACTED_PRIVATE_KEY>"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "<REDACTED_AWS_ACCESS_KEY_ID>"),
    (re.compile(r"ASIA[0-9A-Z]{16}"), "<REDACTED_AWS_TEMP_ACCESS_KEY_ID>"),
    (re.compile(r"(?i)aws_secret_access_key\s*=\s*([0-9A-Za-z/+]{35,})"), "aws_secret_access_key=<REDACTED>"),
    (re.compile(r"(?i)github_?token\s*[:=]\s*['\"]?[0-9a-zA-Z_]{20,}['\"]?"), "GITHUB_TOKEN=<REDACTED>"),
    (re.compile(r"(?i)xox[baprs]-[0-9A-Za-z-]{10,}"), "<REDACTED_SLACK_TOKEN>"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "<REDACTED_GOOGLE_API_KEY>"),
    (re.compile(r"(?i)secret(?:s)?\s*[:=]\s*['\"][^'\"]+['\"]"), "secret=<REDACTED>"),
    (re.compile(r"(?i)password\s*[:=]\s*['\"][^'\"]+['\"]"), "password=<REDACTED>"),
    (re.compile(r"(?i)token\s*[:=]\s*['\"][^'\"]+['\"]"), "token=<REDACTED>"),
]

LANG_MAP = {
    ".py":"python",".js":"javascript",".jsx":"javascript",".ts":"typescript",".tsx":"typescript",
    ".json":"json",".yml":"yaml",".yaml":"yaml",".toml":"toml",".md":"markdown",".rst":"rst",
    ".ini":"ini",".cfg":"ini",".txt":"text",".css":"css",".scss":"scss",".sass":"sass",
    ".html":"html",".htm":"html",".vue":"vue",".svelte":"svelte",".go":"go",".rs":"rust",
    ".java":"java",".kt":"kotlin",".kts":"kotlin",".cs":"csharp",".c":"c",".cc":"cpp",".cpp":"cpp",
    ".h":"c",".hpp":"cpp",".sql":"sql",".graphql":"graphql",".gql":"graphql",".proto":"protobuf",
    ".rb":"ruby",".php":"php",".sh":"bash",".bash":"bash",".ps1":"powershell",".dockerfile":"dockerfile",
    ".gradle":"gradle",".make":"make",".mk":"make",".env.example":"dotenv",".conf":"conf",".pl":"perl"
}

def mask_secrets(text: str) -> str:
    masked = text
    for pat, repl in SECRET_PATTERNS:
        masked = pat.sub(repl, masked)
    return masked

def should_skip_file(path: Path) -> bool:
    if path.name in SKIP_FILES_EXACT:
        return True
    if path.suffix.lower() not in ALLOW_EXT and path.suffix != "":
        return True
    # allow dotfiles like .env.example but block .env*
    if path.name.startswith(".env") and path.name != ".env.example":
        return True
    # crude binary guard
    try:
        chunk = path.read_bytes()[:8192]
        if b"\x00" in chunk:
            return True
    except Exception:
        return True
    return False

def iter_files(repo: Path):
    for dirpath, dirnames, filenames in os.walk(repo):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            rel = p.relative_to(repo)
            if should_skip_file(p):
                continue
            yield p, rel

def chunk_text(text: str, max_chars: int):
    if len(text) <= max_chars:
        return [text]
    # Prefer split by lines, keeping chunks under max_chars
    lines = text.splitlines(keepends=True)
    chunks, buf = [], []
    total = 0
    for line in lines:
        if total + len(line) > max_chars and buf:
            chunks.append("".join(buf))
            buf, total = [line], len(line)
        else:
            buf.append(line)
            total += len(line)
    if buf:
        chunks.append("".join(buf))
    return chunks

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", default=".", help="Path to repo root")
    ap.add_argument("--out", default="codepack_out", help="Output directory")
    ap.add_argument("--chunk-chars", type=int, default=DEFAULT_CHUNK, help="Target chars per chunk")
    ap.add_argument("--max-file-chars", type=int, default=DEFAULT_MAX_FILE, help="Max chars per single file (truncate if larger)")
    args = ap.parse_args()

    repo = Path(args.path).resolve()
    outdir = Path(args.out).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "repo_name": repo.name,
        "path": str(repo),
        "chunk_chars": args.chunk_chars,
        "max_file_chars": args.max_file_chars,
        "files": []
    }

    jsonl_path = outdir / "code.jsonl"
    csv_path = outdir / "file_list.csv"

    n_chunks = 0
    n_files = 0
    total_chars = 0

    with open(jsonl_path, "w", encoding="utf-8") as jf, open(csv_path, "w", encoding="utf-8", newline="") as cf:
        cw = csv.writer(cf)
        cw.writerow(["path","language","size_bytes","lines","chunks","note"])
        for p, rel in iter_files(repo):
            try:
                raw = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            # truncate very large files with tail notice
            truncated = False
            if len(raw) > args.max_file_chars:
                raw = raw[:args.max_file_chars] + "\n\n/* <TRUNCATED by codepack> */\n"
                truncated = True
            masked = mask_secrets(raw)
            # chunk
            chunks = chunk_text(masked, args.chunk_chars)
            # write jsonl per chunk
            lang = LANG_MAP.get(p.suffix.lower(), "text")
            for i, ch in enumerate(chunks, 1):
                rec = {
                    "path": str(rel).replace("\\","/"),
                    "language": lang,
                    "chunk_index": i,
                    "chunks_total": len(chunks),
                    "start_line": None,  # optional; could be added later with line-aware split
                    "end_line": None,
                    "content": ch
                }
                jf.write(json.dumps(rec, ensure_ascii=False) + "\n")
                n_chunks += 1
                total_chars += len(ch)
            n_files += 1
            manifest["files"].append({"path": str(rel), "language": lang, "chunks": len(chunks), "truncated": truncated})
            cw.writerow([str(rel), lang, p.stat().st_size, masked.count("\n")+1, len(chunks), "truncated" if truncated else ""])

    manifest["stats"] = {"files": n_files, "chunks": n_chunks, "chars": total_chars}
    (outdir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # helper prompts
    prompt_ru = f"""Ты — системный архитектор и старший разработчик. 
У тебя есть снапшот архитектуры и исходный код проекта Gert.pro.
Задачи:
1) Дай обзор архитектуры, найди риски и технический долг.
2) Предложи план улучшений на 1–2 дня, 2 недели и 1–2 месяца.
3) Проведи ревью ключевых модулей (API, сервисы, БД/кэш, фронт-опросы с уникальными обработчиками результатов).
4) Учитывай лимиты модулей: M1=45 мин, M2=15 мин. Приоритет — «Портрет талантов».

Материалы:
- summary.yaml и arch.md (если приложены)
- code.jsonl — файл, где каждая строка — JSON-объект с полями: path, language, chunk_index, chunks_total, content.

Инструкции по работе:
- Сначала прочитай arch.md/summary.yaml (если есть), затем проходи по code.jsonl.
- Пропускай boilerplate и сгенерированные файлы.
- Пиши ответы структурировано: Сводка → Риски → Предложения → Быстрые фиксы → Дорожная карта.
"""
    prompt_en = """You are a principal engineer and software architect.
You receive an architecture snapshot and the full source code as JSONL chunks.
Tasks:
1) Provide an architectural overview with risks and technical debt.
2) Propose a plan of improvements for 1–2 days, 2 weeks, and 1–2 months.
3) Review key modules (API, services, DB/cache, front-end surveys with unique result handlers).
4) Consider module time limits: M1=45 min, M2=15 min. Priority: “Talent Portrait”.

Materials:
- summary.yaml and arch.md (if supplied)
- code.jsonl — one JSON object per line with: path, language, chunk_index, chunks_total, content.

Instructions:
- Read arch.md/summary.yaml first, then iterate over code.jsonl.
- Skip boilerplate and generated files.
- Structure output: Overview → Risks → Recommendations → Quick wins → Roadmap.
"""
    (outdir / "prompt_user_ru.md").write_text(prompt_ru, encoding="utf-8")
    (outdir / "prompt_user_en.md").write_text(prompt_en, encoding="utf-8")

    readme = f"""# CodePack Output

This folder was generated by `codepack.py` on {datetime.utcnow().isoformat()}Z.

## Files
- `code.jsonl` — the source code, chunked for LLM ingestion (one JSON per line).
- `manifest.json` — summary stats and file/chunk mapping.
- `file_list.csv` — list of included files with sizes and chunk counts.
- `prompt_user_ru.md`, `prompt_user_en.md` — ready prompts for analysis.

## Tips
- Upload `arch.md` and `summary.yaml` next to `code.jsonl` if available (e.g., produced by archsnap.py).
- If your LLM tool supports multiple files, include all of the above.
- If there's an upload size limit, split `code.jsonl` into multiple parts (by lines).
- Secrets: `.env*` is excluded, and common secrets are masked. Still review before sharing externally.

## CLI options
```
python3 codepack.py --path . --out codepack_out --chunk-chars 8000 --max-file-chars 120000
```
"""
    (outdir / "README.md").write_text(readme, encoding="utf-8")

    print(f"Done. Output at: {outdir}")

if __name__ == "__main__":
    main()
