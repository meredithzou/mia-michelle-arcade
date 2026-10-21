#!/usr/bin/env python3
"""Arcade-wide static quality gate (run: python3 scripts/check_site.py).

Checks every playable game for a home link, title, mobile viewport, analytics,
and valid local assets. Also compares homepage cards with README and other
published game-count claims so descriptions do not become stale.

Automatically discovers games/*/index.html; legacy URL redirects are exempt.
This is a structural check, not a browser/touch/audio end-to-end test.
"""
from html.parser import HTMLParser
import re
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
    """Collect HTML resource URLs, navigation links, and page metadata.

    This is a source-code check, not a JavaScript or browser interaction test.
    """
    def __init__(self):
        """Initialize lists of resources, anchors, and page metadata flags."""
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
        """Record URLs, script order, link labels, and metadata as tags open."""
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
        """Collect readable anchor text and browser title text."""
        if self._anchor is not None:
            self._anchor["text"] += data
        if self._in_title:
            self.title += data

    def handle_endtag(self, tag):
        """Finish recording an anchor or title when its tag closes."""
        if tag == "a" and self._anchor is not None:
            self.anchors.append(self._anchor)
            self._anchor = None
        if tag == "title":
            self._in_title = False


def parse(path):
    """Read one HTML file and return parsed page metadata.

    Report decoding or parsing errors instead of silently skipping a page.
    """
    page = Page()
    try:
        page.feed(path.read_text(encoding="utf-8"))
        page.close()
    except (UnicodeError, ValueError) as exc:
        ERRORS.append(f"Cannot parse {path.relative_to(ROOT)}: {exc}")
    return page


def check_links(path, page):
    """Validate local href, src, and srcset paths relative to the HTML file.

    External URLs and in-page anchors are excluded; missing or out-of-repo
    targets fail the PR checks.
    """
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
    """Require one analytics config and one loader, in the correct order.

    Root pages and games use different relative script paths.
    """
    prefix = "" if path.parent == ROOT else "../../"
    expected = (prefix + "analytics/config.js", prefix + "analytics/analytics.js")
    for asset in expected:
        if page.scripts.count(asset) != 1:
            ERRORS.append(f"{path.relative_to(ROOT)}: expected exactly one script {asset}")
    if all(asset in page.scripts for asset in expected):
        if page.scripts.index(expected[0]) > page.scripts.index(expected[1]):
            ERRORS.append(f"{path.relative_to(ROOT)}: analytics config must load before analytics.js")


def check_game(path, page):
    """Require a page title, mobile viewport, labeled home link, and analytics.

    This runs for playable games, not for compatibility redirect pages.
    """
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



class CardParser(HTMLParser):
    """Read the displayed name, description, preview, badge, and URL of each
    homepage game card for comparison with the README and game pages.
    """
    def __init__(self):
        """Initialize the homepage card list and current text field."""
        super().__init__(convert_charrefs=True)
        self.cards = []
        self.current = None
        self.field = None

    def handle_starttag(self, tag, attrs):
        """Start a card and capture its links, images, and labeled fields."""
        a = dict(attrs)
        classes = a.get("class", "").split()
        if tag == "article" and "card" in classes:
            self.current = {"name": "", "desc": "", "players": "", "links": [], "images": []}
            return
        if self.current is None:
            return
        if tag == "a" and a.get("href"):
            self.current["links"].append(a["href"])
        elif tag == "img":
            self.current["images"].append({"src": a.get("src", ""), "alt": a.get("alt", "")})
        elif tag == "div" and "name" in classes:
            self.field = "name"
        elif tag == "div" and "desc" in classes:
            self.field = "desc"
        elif tag == "span" and "chip" in classes:
            self.field = "players"

    def handle_data(self, data):
        """Collect text for the active card name, description, or badge."""
        if self.current is not None and self.field:
            self.current[self.field] += data

    def handle_endtag(self, tag):
        """Finish a card field or store the completed article card."""
        if self.current is None:
            return
        if (tag == "div" and self.field in ("name", "desc")) or (
            tag == "span" and self.field == "players"
        ):
            self.field = None
        if tag == "article":
            self.cards.append(self.current)
            self.current = None
            self.field = None


def normalized_name(name):
    """Compare game names while ignoring emoji, spacing, and punctuation.

    Changes to actual name words must still be detected.
    """
    return re.sub(r"[^a-z0-9]+", "", name.casefold())


def check_catalog(home_source, game_pages, published_pages):
    """Compare homepage game cards, README entries, and game titles.

    Validate card links, preview/alt text, description, and player badges;
    also flag outdated game-count claims in the public documents.
    Unlisted playable games remain allowed during development.
    """
    cards_parser = CardParser()
    cards_parser.feed(home_source)
    cards_parser.close()
    cards = cards_parser.cards
    available = {p.parent.name for p in game_pages if p.parent.name not in REDIRECTS}
    cards_by_slug = {}

    if not cards:
        ERRORS.append("Homepage has no game cards")
    for i, card in enumerate(cards, start=1):
        links = [x for x in card["links"] if x.startswith("games/") and x.endswith("/index.html")]
        slugs = {x.split("/")[1] for x in links}
        if len(slugs) != 1:
            ERRORS.append(f"Homepage card #{i}: expected one consistent game destination")
            continue
        slug = next(iter(slugs))
        if slug in cards_by_slug:
            ERRORS.append(f"Homepage: duplicate card for {slug}")
        cards_by_slug[slug] = card
        if slug not in available:
            ERRORS.append(f"Homepage card #{i}: unknown game {slug}")
            continue
        if not card["name"].strip() or not card["desc"].strip():
            ERRORS.append(f"Homepage card #{i} ({slug}): missing name or description")
        if not re.fullmatch(r"1 Player|(?:[2-9]\d*|1\d+|\d+[–-]\d+) Players", card["players"].strip()):
            ERRORS.append(f"Homepage card #{i} ({slug}): missing/invalid player-count badge")
        if not card["images"] or not card["images"][0]["src"].startswith("assets/") or not card["images"][0]["alt"].strip():
            ERRORS.append(f"Homepage card #{i} ({slug}): missing preview image or alt text")

        game_title = published_pages[slug].title.strip()
        game_name = re.split(r"\s+(?:\||·|—)\s+", game_title, maxsplit=1)[0]
        if normalized_name(card["name"]) != normalized_name(game_name):
            ERRORS.append(f"Homepage card #{i} ({slug}): name differs from game title '{game_name}'")

    readme_path = ROOT / "README.md"
    readme = readme_path.read_text(encoding="utf-8") if readme_path.is_file() else ""
    entries = re.findall(r"^\|\s*\[([^\]]+)\]\(games/([a-z0-9-]+)/\)\s*\|", readme, re.MULTILINE)
    listed = {}
    for name, slug in entries:
        if slug in listed:
            ERRORS.append(f"README: duplicate game entry {slug}")
        listed[slug] = name
        if slug in cards_by_slug and normalized_name(name) != normalized_name(cards_by_slug[slug]["name"]):
            ERRORS.append(f"README: name for {slug} differs from homepage card")
    if set(listed) != set(cards_by_slug):
        ERRORS.append(
            f"README/homepage published games differ: "
            f"README={sorted(listed)}, homepage={sorted(cards_by_slug)}"
        )

    count_words = {word: i for i, word in enumerate(
        ("zero", "one", "two", "three", "four", "five", "six",
         "seven", "eight", "nine", "ten")
    )}
    pattern = re.compile(
        r"\b(?P<count>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)"
        r"\s+(?:[A-Za-z-]+\s+){0,2}games?\b", re.IGNORECASE
    )
    for relative in ("index.html", "README.md", "analytics/README.md"):
        path = ROOT / relative
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for match in pattern.finditer(content):
            token = match.group("count").lower()
            stated = int(token) if token.isdecimal() else count_words[token]
            if stated != len(cards_by_slug):
                ERRORS.append(
                    f"{relative}: stale game-count claim '{match.group(0)}' "
                    f"(homepage currently lists {len(cards_by_slug)} games)"
                )
    return len(cards_by_slug)


def main():
    """Run all static checks and return 0 on success or 1 on failure.

    Discover game pages automatically, exempt known legacy redirects,
    check each playable game, then compare the published catalogs.
    """
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
    published_pages = {}
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
        published_pages[slug] = page
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

    published = check_catalog(home_path.read_text(encoding="utf-8") if home_path.is_file() else "", game_pages, published_pages)

    if ERRORS:
        print("\n".join(ERRORS))
        return 1
    print(f"Site checks passed: {playable} playable games, {published} published cards, catalog consistency, analytics, navigation, and local assets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
