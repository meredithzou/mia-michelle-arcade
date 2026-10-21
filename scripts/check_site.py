#!/usr/bin/env python3
"""Static Arcade quality gate: every playable game follows shared site rules."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys

root = Path(__file__).resolve().parent.parent
games_dir = root / "games"

# Compatibility-only URLs: these redirect to renamed games, not playable pages.
redirects = {
    "name-the-note": "name-that-note",
    "find-that-note": "play-that-note",
}
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
)
errors = [f"Missing {path}" for path in required if not (root / path).is_file()]


class PageInspector(HTMLParser):
    """Inspect real HTML tags, rather than matching strings inside JavaScript."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.scripts = []
        self.anchors = []
        self.viewport = False
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attributes.get("name", "").lower() == "viewport":
            self.viewport = bool(attributes.get("content", "").strip())
        if tag == "a":
            self.anchors.append(attributes)
        if tag == "script" and attributes.get("src"):
            self.scripts.append(attributes["src"])
        if tag in ("a", "img", "link", "script", "source"):
            for name in ("href", "src"):
                if attributes.get(name):
                    self.links.append(attributes[name])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def inspect(page):
    parser = PageInspector()
    parser.feed(page.read_text(encoding="utf-8"))
    return parser


def local_path(page, link):
    url = urlsplit(link)
    if url.scheme or url.netloc or link.startswith(("#", "//")):
        return None
    path = unquote(url.path)
    if not path:
        return None
    return (page.parent / path).resolve()


def check_local_links(page, info):
    for link in info.links:
        target = local_path(page, link)
        if target is not None and not target.is_file():
            errors.append(f"{page.relative_to(root)}: broken local resource/link: {link}")


def check_analytics(page, info):
    expected = (
        "analytics/config.js" if page.parent == root else "../../analytics/config.js",
        "analytics/analytics.js" if page.parent == root else "../../analytics/analytics.js",
    )
    for script in expected:
        if info.scripts.count(script) != 1:
            errors.append(f"{page.relative_to(root)}: expected exactly one {script}")
    if all(script in info.scripts for script in expected):
        if info.scripts.index(expected[0]) > info.scripts.index(expected[1]):
            errors.append(f"{page.relative_to(root)}: analytics config must load before analytics loader")


pages = {}
for page in (root / "index.html", root / "privacy.html"):
    if page.is_file():
        pages[page] = inspect(page)

if not games_dir.is_dir():
    errors.append("Missing games/ directory")
    game_pages = []
else:
    game_pages = sorted(games_dir.glob("*/index.html"))
    for page in game_pages:
        pages[page] = inspect(page)

for page, info in pages.items():
    check_local_links(page, info)

home = root / "index.html"
if home in pages:
    if not pages[home].title.strip():
        errors.append("index.html: missing page title")
    if not pages[home].viewport:
        errors.append("index.html: missing mobile viewport")
    check_analytics(home, pages[home])
    home_source = home.read_text(encoding="utf-8")
    for text in ("Mia and Michelle", "Pick a game", "Made with ChatGPT"):
        if text not in home_source:
            errors.append(f"index.html: missing homepage text: {text}")

privacy = root / "privacy.html"
if privacy in pages:
    check_analytics(privacy, pages[privacy])

playable = []
for page in game_pages:
    slug = page.parent.name
    info = pages[page]
    if slug in redirects:
        target = f"../{redirects[slug]}/index.html"
        if target not in info.links:
            errors.append(f"{page.relative_to(root)}: redirect needs a fallback link to {target}")
        continue

    playable.append(page)
    label = str(page.relative_to(root))
    if not info.title.strip():
        errors.append(f"{label}: missing non-empty <title>")
    if not info.viewport:
        errors.append(f"{label}: missing <meta name='viewport'>")
    if not any(
        local_path(page, anchor.get("href", "")) == home.resolve()
        for anchor in info.anchors
    ):
        errors.append(f"{label}: missing clickable <a> link back to Arcade homepage")
    check_analytics(page, info)

# Every game folder should have an index; otherwise it is silently omitted.
if games_dir.is_dir():
    for folder in sorted(p for p in games_dir.iterdir() if p.is_dir()):
        if not (folder / "index.html").is_file():
            errors.append(f"games/{folder.name}: missing index.html")

if not playable:
    errors.append("No playable games discovered")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Site quality gate passed ({len(playable)} playable games, {len(redirects)} legacy redirects, links, return navigation, analytics, titles, viewport)")
