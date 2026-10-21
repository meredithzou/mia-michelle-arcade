#!/usr/bin/env python3
"""Static quality contract for Arcade pages and independently shipped games."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parent.parent
ERRORS = []

# Compatibility URLs are redirects, not playable games. Their targets must exist.
REDIRECTS = {
    "name-the-note": "name-that-note",
    "find-that-note": "play-that-note",
}
REQUIRED = (
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
for path in REQUIRED:
    if not (ROOT / path).is_file():
        ERRORS.append(f"Missing required file: {path}")


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.scripts = []
        self.anchors = []
        self.title = ""
        self.viewport = False
        self.redirect = False
        self._anchor = None
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a":
            self._anchor = {"href": a.get("href", ""), "label": a.get("aria-label", ""), "text": ""}
        if tag == "title":
            self._in_title = True
        if tag == "meta":
            if a.get("name", "").lower() == "viewport" and a.get("content"):
                self.viewport = True
            if a.get("http-equiv", "").lower() == "refresh":
                self.redirect = True
        if tag == "script" and a.get("src"):
            self.scripts.append(a["src"])
        if tag in ("a", "link", "script", "img", "source"):
            for attribute in ("href", "src", "srcset"):
                if a.get(attribute):
                    if attribute == "srcset":
                        for item in a[attribute].split(","):
                            self.links.append(item.strip().split()[0])
                    else:
                        self.links.append(a[attribute])

    def handle_data(self, data):
        if self._anchor is not None:
            self._anchor["text"] += data
        if self._in_title:
            self.title += data

    def handle_endtag(self, tag):
        if tag == "a" and self._anchor is not None:
            self.anchors.append(self._anchor)
            self._anchor = None
        if tag == "title":
            self._in_title = False


def parse(path):
    page = Page()
    try:
        page.feed(path.read_text(encoding="utf-8"))
        page.close()
    except (UnicodeError, ValueError) as exc:
        ERRORS.append(f"Cannot parse {path.relative_to(ROOT)}: {exc}")
    return page


def check_links(path, page):
    for link in page.links:
        parts = urlsplit(link)
        if parts.scheme or parts.netloc or link.startswith(("#", "//")):
            continue
        local = unquote(parts.path)
        if not local:
            continue
        # Resolve relative URLs within the repository, without escaping its root.
        target = (path.parent / local).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            ERRORS.append(f"Broken local link in {path.relative_to(ROOT)}: {link}")


def check_analytics(path, page):
    prefix = "" if path.parent == ROOT else "../../"
    expected = (prefix + "analytics/config.js", prefix + "analytics/analytics.js")
    for asset in expected:
        if page.scripts.count(asset) != 1:
            ERRORS.append(f"{path.relative_to(ROOT)}: expected exactly one script {asset}")
    if all(asset in page.scripts for asset in expected):
        if page.scripts.index(expected[0]) > page.scripts.index(expected[1]):
            ERRORS.append(f"{path.relative_to(ROOT)}: analytics config must load before analytics.js")


def check_game(path, page):
    name = path.relative_to(ROOT)
    if not page.title.strip():
        ERRORS.append(f"{name}: missing nonempty <title>")
    if not page.viewport:
        ERRORS.append(f"{name}: missing mobile viewport meta tag")
    home = [a for a in page.anchors if a["href"] == "../../index.html"]
    if not home:
        ERRORS.append(f"{name}: missing return-to-Arcade link (../../index.html)")
    elif not any(a["label"].strip() or a["text"].strip() for a in home):
        ERRORS.append(f"{name}: return-to-Arcade link needs visible text or aria-label")
    check_analytics(path, page)


def main():
    home_path = ROOT / "index.html"
    if home_path.is_file():
        home = parse(home_path)
        check_links(home_path, home)
        check_analytics(home_path, home)
        for phrase in ("Mia and Michelle", "Pick a game", "Made with ChatGPT"):
            if phrase not in home_path.read_text(encoding="utf-8"):
                ERRORS.append(f"Homepage missing: {phrase}")
    else:
        home = Page()

    privacy_path = ROOT / "privacy.html"
    if privacy_path.is_file():
        privacy = parse(privacy_path)
        check_links(privacy_path, privacy)
        check_analytics(privacy_path, privacy)

    game_root = ROOT / "games"
    game_pages = sorted(game_root.glob("*/index.html")) if game_root.is_dir() else []
    playable = 0
    if not game_pages:
        ERRORS.append("No game entry pages found in games/*/index.html")

    for path in game_pages:
        slug = path.parent.name
        page = parse(path)
        check_links(path, page)
        if slug in REDIRECTS:
            target = f"../{REDIRECTS[slug]}/index.html"
            if not page.redirect or target not in page.links:
                ERRORS.append(f"{path.relative_to(ROOT)}: invalid compatibility redirect to {target}")
            continue
        if page.redirect:
            ERRORS.append(f"{path.relative_to(ROOT)}: unregistered redirect; add it to REDIRECTS")
            continue
        playable += 1
        check_game(path, page)

    for slug, target in REDIRECTS.items():
        if not (game_root / slug / "index.html").is_file():
            ERRORS.append(f"Missing compatibility redirect: games/{slug}/index.html")
        if not (game_root / target / "index.html").is_file():
            ERRORS.append(f"Missing redirect destination: games/{target}/index.html")

    # Cards must link to real game entry points. Games may intentionally remain
    # unlisted during development, so we don't require a card for every game.
    for anchor in home.anchors:
        href = anchor["href"]
        if href.startswith("games/") and href.endswith("/index.html"):
            slug = href.split("/")[1]
            if slug in REDIRECTS:
                ERRORS.append(f"Homepage links to legacy redirect instead of current game: {href}")

    if ERRORS:
        print("\n".join(ERRORS))
        return 1
    print(f"Site checks passed: {playable} games, return links, analytics, titles, viewport, and local assets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
