#!/usr/bin/env python3
"""
archsnap.py — fast "architecture snapshot" for repositories.

Usage (from repo root):
  python3 archsnap.py
  # or specify target path:
  python3 archsnap.py --path /path/to/repo --out outdir

Outputs:
  out/
    tree.json           — directory tree (filtered)
    summary.yaml        — high-level tech summary
    deps_backend.txt    — Python deps (best-effort)
    deps_frontend.txt   — JS deps (best-effort)
    arch.md             — human-readable overview with Mermaid
    files_index.csv     — flat list of files with sizes & types

Notes:
- External tools are optional. If installed, they enrich results:
    - pip (for pip freeze)
    - npm or pnpm (for npm list --depth=0 or pnpm list -P --depth=0)
- The script is safe to run in CI/CD.
"""
import argparse
import os
import sys
import re
import json
import csv
import subprocess
from pathlib import Path
from datetime import datetime

SKIP_DIRS = {
    ".git", ".hg", ".svn", "__pycache__", "node_modules", "dist", "build",
    ".next", ".cache", ".mypy_cache", ".pytest_cache", ".venv", "venv",
    ".idea", ".vscode", ".ds_store"
}
TEXT_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml", ".toml",
    ".md", ".rst", ".ini", ".cfg", ".txt", ".css", ".scss", ".sass", ".html"
}

def human_bytes(n):
    for unit in ["B","KB","MB","GB","TB"]:
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}PB"

def detect_stack(repo: Path):
    signals = {
        "backend": None,
        "frontend": None,
        "infra": [],
        "datastores": [],
        "ci": [],
        "notes": []
    }
    # Backend
    if (repo / "pyproject.toml").exists() or (repo / "requirements.txt").exists():
        signals["backend"] = "Python"
        # frameworks
        text = ""
        for f in ["requirements.txt", "pyproject.toml"]:
            p = repo / f
            if p.exists():
                try:
                    text += p.read_text(encoding="utf-8", errors="ignore")
                except:
                    pass
        fw = []
        for name in ["fastapi", "flask", "django", "starlette", "pydantic", "sqlalchemy"]:
            if re.search(rf"(?i)\b{name}\b", text):
                fw.append(name.capitalize())
        if fw:
            signals["backend"] += " (" + ", ".join(sorted(set(fw))) + ")"

    # Frontend
    pkg = repo / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8", errors="ignore"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            fe = []
            for k in deps.keys():
                if k in ["react", "next", "vue", "svelte", "vite", "angular", "tailwindcss"]:
                    fe.append(k)
            if fe:
                signals["frontend"] = "JS: " + ", ".join(sorted(set(fe)))
            else:
                signals["frontend"] = "JS"
        except Exception as e:
            signals["frontend"] = "JS"

    # Infra
    for name in ["docker-compose.yml", "Dockerfile", "compose.yml"]:
        if (repo / name).exists():
            signals["infra"].append(name)
    ga = repo / ".github" / "workflows"
    if ga.exists():
        signals["ci"].append("GitHub Actions")
    for name in ["Jenkinsfile", ".gitlab-ci.yml"]:
        if (repo / name).exists():
            signals["ci"].append(name)

    # Datastores (heuristic)
    text = ""
    for f in ["requirements.txt", "pyproject.toml", "docker-compose.yml", "compose.yml"]:
        p = repo / f
        if p.exists():
            try:
                text += p.read_text(encoding="utf-8", errors="ignore")
            except:
                pass
    for marker, label in [
        ("postgres", "PostgreSQL"), ("psycopg", "PostgreSQL"),
        ("mysql", "MySQL"), ("mariadb", "MariaDB"),
        ("mongodb", "MongoDB"), ("redis", "Redis"),
        ("elastic", "Elasticsearch"), ("opensearch", "OpenSearch"),
        ("sqlite", "SQLite"), ("clickhouse", "ClickHouse"),
        ("rabbitmq", "RabbitMQ"), ("kafka", "Kafka")
    ]:
        if re.search(rf"(?i)\b{re.escape(marker)}\b", text):
            signals["datastores"].append(label)

    return signals

def build_tree(repo: Path):
    def walk(d: Path):
        children = []
        try:
            for entry in sorted(d.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
                if entry.is_dir():
                    if entry.name in SKIP_DIRS:
                        continue
                    children.append({
                        "type": "dir",
                        "name": entry.name,
                        "children": walk(entry)
                    })
                else:
                    children.append({
                        "type": "file",
                        "name": entry.name,
                        "size": entry.stat().st_size
                    })
        except PermissionError:
            pass
        return children
    return {"type": "dir", "name": repo.name, "children": walk(repo)}

def render_tree_as_text(node, prefix=""):
    lines = []
    name = node.get("name", "")
    children = node.get("children", [])
    lines.append(name + "/")
    def rec(children, prefix):
        for i, child in enumerate(children):
            connector = "└── " if i == len(children) - 1 else "├── "
            if child["type"] == "dir":
                lines.append(prefix + connector + child["name"] + "/")
                rec(child.get("children", []), prefix + ("    " if i == len(children)-1 else "│   "))
            else:
                lines.append(prefix + connector + child["name"])
    rec(children, "")
    return "\n".join(lines)

def flat_index(repo: Path, out_csv: Path):
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["path", "size_bytes", "size_human", "ext", "text_like"])
        for dirpath, dirnames, filenames in os.walk(repo):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                p = Path(dirpath) / fn
                try:
                    size = p.stat().st_size
                    ext = p.suffix.lower()
                    text_like = ext in TEXT_EXTS
                    w.writerow([str(p.relative_to(repo)), size, human_bytes(size), ext, text_like])
                except Exception:
                    pass

def best_effort_cmd(cmd):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)
        return out.strip()
    except Exception as e:
        return f"# Could not run: {' '.join(cmd)}\n# {e}"

def write_yaml(d):
    # minimal YAML dumper to avoid dependency
    lines = []
    def dump(k, v, indent=0):
        sp = "  " * indent
        if isinstance(v, dict):
            lines.append(f"{sp}{k}:")
            for kk, vv in v.items():
                dump(kk, vv, indent+1)
        elif isinstance(v, list):
            lines.append(f"{sp}{k}:")
            for item in v:
                lines.append(f"{sp}  - {item}")
        else:
            lines.append(f"{sp}{k}: {v}")
    for k, v in d.items():
        dump(k, v, 0)
    return "\n".join(lines) + "\n"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", default=".", help="Path to repo root")
    ap.add_argument("--out", default="archsnap_out", help="Output directory")
    ap.add_argument("--max-tree-bytes", type=int, default=10_000_000, help="Skip files larger than this when rendering tree text")
    args = ap.parse_args()

    repo = Path(args.path).resolve()
    outdir = Path(args.out).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.utcnow().isoformat() + "Z"

    # Tree
    tree = build_tree(repo)
    (outdir / "tree.json").write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")

    tree_text = render_tree_as_text(tree)
    (outdir / "tree.txt").write_text(tree_text, encoding="utf-8")

    # Flat index
    flat_index(repo, outdir / "files_index.csv")

    # Detect stack
    signals = detect_stack(repo)
    summary = {
        "generated_at": stamp,
        "repo_name": repo.name,
        "path": str(repo),
        "backend": signals["backend"],
        "frontend": signals["frontend"],
        "infra": signals["infra"],
        "ci": signals["ci"],
        "datastores": sorted(set(signals["datastores"]))
    }
    (outdir / "summary.yaml").write_text(write_yaml(summary), encoding="utf-8")

    # Deps (best-effort)
    # Python
    dep_py = ""
    req = repo / "requirements.txt"
    if req.exists():
        dep_py += req.read_text(encoding="utf-8", errors="ignore") + "\n"
    dep_py += "\n# pip freeze (if available)\n" + best_effort_cmd(["python3", "-m", "pip", "freeze"])
    (outdir / "deps_backend.txt").write_text(dep_py, encoding="utf-8")

    # JS
    dep_js = ""
    pkg = repo / "package.json"
    if pkg.exists():
        dep_js += pkg.read_text(encoding="utf-8", errors="ignore") + "\n"
    # npm / pnpm best-effort
    tried = best_effort_cmd(["npm", "list", "--depth=0"])
    if "Could not run" in tried:
        tried = best_effort_cmd(["pnpm", "list", "-P", "--depth=0"])
    dep_js += "\n# package manager list\n" + tried
    (outdir / "deps_frontend.txt").write_text(dep_js, encoding="utf-8")

    # arch.md
    arch_md = []
    arch_md.append(f"# Architecture Snapshot — {repo.name}\n")
    arch_md.append(f"- Generated: `{stamp}`\n")
    arch_md.append("## Tech summary\n")
    arch_md.append("```yaml\n" + write_yaml(summary) + "```\n")
    arch_md.append("## File tree (filtered)\n")
    arch_md.append("```text\n" + tree_text + "\n```\n")
    # Mermaid: high-level (heuristic)
    arch_md.append("## High-level topology (heuristic)\n")
    mermaid = ["flowchart LR"]
    if summary["frontend"]:
        mermaid.append("Client((Client)) --> FE[Frontend]")
        if summary["backend"]:
            mermaid.append("FE --> BE[Backend]")
        else:
            mermaid.append("FE -->|APIs| External[External APIs]")
    if summary["backend"]:
        if summary["frontend"] is None:
            mermaid.append("Client((Client)) --> BE[Backend]")
        for ds in summary["datastores"]:
            mermaid.append(f"BE --> {ds.replace(' ','_')}(({ds}))")
    if not summary["frontend"] and not summary["backend"]:
        mermaid.append("Client((Client)) --> Service[Service]")
    arch_md.append("```mermaid\n" + "\n".join(mermaid) + "\n```\n")
    arch_md.append("## Dependency notes\n")
    arch_md.append("- See `deps_backend.txt` and `deps_frontend.txt` for details.\n")
    arch_md.append("## Next steps\n")
    arch_md.append("- Feed `arch.md` and `summary.yaml` to your LLM for analysis.\n")
    (outdir / "arch.md").write_text("\n".join(arch_md), encoding="utf-8")

    print(f"Done. Output in: {outdir}")

if __name__ == "__main__":
    main()
