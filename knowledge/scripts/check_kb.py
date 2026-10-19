#!/usr/bin/env python3
"""离线检查知识库相对链接与基本文件结构；不执行网络访问、不可替代事实核验。"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {".git", ".venv", "__pycache__"}
LINK_PATTERN = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
SKIP_PREFIXES = ("https://", "http://", "mailto:", "data:", "javascript:")


def main() -> int:
    md_files = sorted(
        p for p in ROOT.rglob("*.md")
        if not any(part in EXCLUDED for part in p.relative_to(ROOT).parts)
    )
    missing: list[tuple[Path, str]] = []
    for p in md_files:
        text = p.read_text(encoding="utf-8")
        for raw in LINK_PATTERN.findall(text):
            link = raw.strip().split(' "', 1)[0].strip("<>")
            if not link or link.startswith(("#",) + SKIP_PREFIXES):
                continue
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            target = (p.parent / unquote(parsed.path)).resolve()
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                missing.append((p, f"越界内部链接: {raw}"))
                continue
            if not target.exists():
                missing.append((p, raw))
    # Verify paths/*.md frontmatter steps without adding a YAML runtime dependency.
    steps_checked = 0
    for learning_path in sorted((ROOT / "paths").glob("*.md")):
        for ref in re.findall(r"^\s+- ref:\s*['\"]?([^'\"\s#]+)", learning_path.read_text(encoding="utf-8"), flags=re.M):
            target = (ROOT / (ref + ".md")).resolve()
            steps_checked += 1
            if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
                missing.append((learning_path, f"学习路线目标缺失或越界: {ref}"))
    if missing:
        for p, target in missing:
            print(f"FAIL {p.relative_to(ROOT)}: {target}")
        return 1
    print(f"OK: 扫描 {len(md_files)} 个 Markdown 文件和 {steps_checked} 个学习路线引用；内部链接路径存在。")
    print("注意：不检查外部 HTTP 链接，也不验证标题锚点或论文事实。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
