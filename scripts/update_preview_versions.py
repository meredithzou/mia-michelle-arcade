#!/usr/bin/env python3
"""Update homepage image and layout stylesheet cache keys from the files' content (Git blob hashes).

Run without arguments after changing homepage images or layout stylesheets. --check is used
by CI so image updates cannot be merged with stale cache keys. This keeps the
GitHub Pages site static: no JavaScript, service worker, or build step needed.
"""
import argparse
import difflib
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
HOME = ROOT / "index.html"
# Inspect only image tags and local layout stylesheet links.
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
LOCAL_IMAGE_SRC = re.compile(
    r"""(?P<attribute>\ssrc\s*=\s*)(?P<quote>["'])"""
    r"""(?P<path>assets/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg))"""
    r"""(?P<query>\?[^"']*)?(?P=quote)""",
    re.IGNORECASE,
)

LINK_TAG = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
LOCAL_STYLE_HREF = re.compile(
    r"""(?P<attribute>\shref\s*=\s*)(?P<quote>["'])"""
    r"""(?P<path>styles/[a-zA-Z0-9_./-]+\.css)"""
    r"""(?P<query>\?[^"']*)?(?P=quote)""", re.IGNORECASE,
)


def image_version(path):
    """Return a short content-derived Git blob SHA, independent of filename.

    Git's blob hash includes the file length and raw bytes, matching the SHA
    shown for the same asset in the GitHub repository. Used only as a cache key.
    """
    content = path.read_bytes()
    header = f"blob {len(content)}\0".encode("ascii")
    return hashlib.sha1(header + content, usedforsecurity=False).hexdigest()[:12]


def version_html(source, root):
    """Version images and layout stylesheets without reformatting or changing other HTML.

    Preserve image attributes and external URLs. Reject unrelated query
    parameters instead of silently removing an intentional image option.
    """
    root = root.resolve()

    def replace_tag(tag_match, pattern=LOCAL_IMAGE_SRC):
        """Rewrite the local image source, if one exists in this <img> tag."""
        def replace_src(match):
            """Replace the current v= value with the asset's content hash."""
            query = match.group("query")
            if query and not re.fullmatch(r"\?v=[0-9a-fA-F]+", query):
                raise ValueError(f"Unexpected image query: {match.group('path')}{query}")
            asset = (root / match.group("path")).resolve()
            if not asset.is_relative_to(root) or not asset.is_file():
                raise FileNotFoundError(f"Missing homepage asset: {match.group('path')}")
            versioned_url = f"{match.group('path')}?v={image_version(asset)}"
            return f"{match.group('attribute')}{match.group('quote')}{versioned_url}{match.group('quote')}"

        return pattern.sub(replace_src, tag_match.group(0), count=1)

    source = IMG_TAG.sub(replace_tag, source)
    def replace_stylesheet(match):
        if not re.search(r"""\brel\s*=\s*["']stylesheet["']""", match.group(0), re.IGNORECASE):
            return match.group(0)
        return replace_tag(match, LOCAL_STYLE_HREF)
    return LINK_TAG.sub(replace_stylesheet, source)


def main():
    """Write the canonical URLs, or fail CI if any hash is outdated."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify without modifying index.html")
    args = parser.parse_args()

    original = HOME.read_text(encoding="utf-8")
    updated = version_html(original, ROOT)
    if args.check:
        if updated != original:
            print("Homepage image/style versions are stale. Run: python3 scripts/update_preview_versions.py")
            print("".join(difflib.unified_diff(original.splitlines(True), updated.splitlines(True), fromfile="index.html", tofile="expected index.html")))
            return 1
        print("Homepage image/style versions are up to date.")
        return 0

    if updated != original:
        HOME.write_text(updated, encoding="utf-8")
        print("Updated homepage image versions in index.html.")
    else:
        print("Homepage image/style versions already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
