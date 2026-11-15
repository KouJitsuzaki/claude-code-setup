"""公開前チェック：公開リポジトリに、外に出してはいけないものが入っていないか調べる。

使い方: py -3 scripts/check_public.py
1件でも見つかれば終了コード1で止まる（.githooks から呼ぶとコミット・プッシュも止まる）。
初回だけ: git config core.hooksPath .githooks
"""
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
ALLOWED_EXT = {".md", ".json", ".py", ".gs", ".txt", ".gitignore", ".gitattributes", ""}

PATTERNS = [
    ("メールアドレス", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
    ("電話番号", re.compile(r"(?<!\d)0\d{1,4}-\d{1,4}-\d{3,4}(?!\d)|(?<!\d)0[789]0\d{8}(?!\d)")),
    ("郵便番号", re.compile(r"〒\s?\d{3}-?\d{4}")),
    ("金額", re.compile(r"[\d,，]+\s?(円|万円|千円)|[¥￥]\s?\d")),
    ("LINE ID", re.compile(r"![A-Za-z]{18}")),
    ("APIキー・トークン", re.compile(r"(sk-[A-Za-z0-9]{20,}|gh[pou]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[bp]-[A-Za-z0-9-]{10,})")),
]


def main():
    problems = []
    for p in sorted(REPO.rglob("*")):
        rel = p.relative_to(REPO)
        if not p.is_file() or ".git" in rel.parts or "__pycache__" in rel.parts:
            continue
        if p.suffix.lower() not in ALLOWED_EXT:
            problems.append(f"{rel}: 置いてよい種類のファイルではない（{p.suffix}）")
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        for n, line in enumerate(text.splitlines(), 1):
            for label, pat in PATTERNS:
                if pat.search(line):
                    problems.append(f"{rel}:{n}: {label}の疑い → {line.strip()[:80]}")
    if problems:
        print("公開前チェックで止めました:\n" + "\n".join(problems))
        sys.exit(1)
    print("公開前チェック: 問題なし")


if __name__ == "__main__":
    main()
