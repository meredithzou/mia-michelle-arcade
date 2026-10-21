#!/usr/bin/env python3
"""Static links, game entry points, and shared analytics smoke checks."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
games = (
    "chicken-jockey-dash",
    "chinese-checkers",
    "name-that-note",
    "play-that-note",
    "do-i-have-absolute-pitch",
)
redirects = ("name-the-note", "find-that-note")
required = (
    "index.html",
    "privacy.html",
    "README.md",
    "site-config.js",
    "styles/base.css",
    "themes/pastel-rainbow/theme.css",
    "analytics/config.js",
    "analytics/analytics.js",
    "shared/settings.js",
    "shared/music/audio.js",
    "assets/chicken-jockey-preview.png",
    "assets/chinese-checkers-preview.png",
    "assets/name-that-note-preview.svg",
    "assets/play-that-note-preview.png",
    "assets/absolute-pitch-preview.jpg",
)
required += tuple(f"games/{slug}/index.html" for slug in games + redirects)
errors = [f"Missing {path}" for path in required if not (root / path).is_file()]

home_path = root / "index.html"
home = home_path.read_text(encoding="utf-8") if home_path.is_file() else ""
for text in ("Mia and Michelle", "Pick a game", "Made with ChatGPT"):
    if text not in home:
        errors.append(f"Missing homepage text: {text}")

for slug in games:
    target = f"games/{slug}/index.html"
    if f'href="{target}"' not in home:
        errors.append(f"Missing homepage game link: {target}")

pages = [root / "index.html", root / "privacy.html"]
pages += [root / "games" / slug / "index.html" for slug in games + redirects]
for page in pages:
    if not page.is_file():
        continue
    source = page.read_text(encoding="utf-8")
    for link in re.findall(r"""(?:href|src)=["']([^"']+)["']""", source):
        if link.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "//", "javascript:")):
            continue
        path = link.split("#", 1)[0].split("?", 1)[0]
        if path and not (page.parent / path).is_file():
            errors.append(f"Broken local link in {page.relative_to(root)}: {link}")

# Old URL compatibility redirects intentionally do not load analytics.
for page in pages[: 2 + len(games)]:
    if not page.is_file():
        continue
    source = page.read_text(encoding="utf-8")
    for asset in ("analytics/config.js", "analytics/analytics.js"):
        expected = asset if page.parent == root else f"../../{asset}"
        if source.count(f'src="{expected}"') != 1:
            errors.append(f"Expected exactly one {asset} in {page.relative_to(root)}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Site checks passed ({len(games)} games, local links, analytics)")
