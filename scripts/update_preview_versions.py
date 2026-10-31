#!/usr/bin/env python3
"""Version local site assets by content. Run after asset edits; CI uses --check.

The historical command name remains supported. CSS dependencies are updated before
parent CSS and HTML, so changing an imported stylesheet or image also changes its
parent's URL. No runtime cache disabling, service worker, or build is required.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
# Match whole script/style blocks so JavaScript strings that resemble HTML stay intact.
HTML_TOKEN = re.compile(r'<!--.*?-->|<script\b[^>]*>.*?</script\s*>|<style\b[^>]*>.*?</style\s*>|<[a-z][^>]*>', re.I | re.S)
ATTRIBUTE = re.compile(r'''(?<![\w:-])(?P<name>(?:src|href|poster))(?P<eq>\s*=\s*)(?P<quote>["'])(?P<url>.*?)(?P=quote)''', re.I | re.S)
CSS_REF = re.compile(r'''url\(\s*(?P<quote>["']?)(?P<url>[^\s()"']+)(?P=quote)\s*\)|@import\s+(?P<iq>["'])(?P<import>[^"']+)(?P=iq)''', re.I)
THEME_MAP = re.compile(r'/\* generated theme URLs \*/.*?/\* end theme URLs \*/', re.S)


def image_version(path):
    """Short Git blob content hash; retained API for existing callers."""
    content = path.read_bytes()
    return hashlib.sha1(f'blob {len(content)}\0'.encode() + content, usedforsecurity=False).hexdigest()[:12]


def asset_url(url, parent, root):
    """Version local files only; retain URL fragments and reject unknown options."""
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path or url.startswith(('#', '//')):
        return url
    asset = ((root if parts.path.startswith('/') else parent) / unquote(parts.path).lstrip('/')).resolve()
    if not asset.is_relative_to(root) or not asset.is_file():
        raise FileNotFoundError(f'Missing or out-of-site asset: {url}')
    # Replace legacy hand-written v= keys too; never silently discard other options.
    if parts.query and not re.fullmatch(r'v=[a-zA-Z0-9_.-]+', parts.query):
        raise ValueError(f'Unexpected asset query: {url}')
    return urlunsplit(('', '', parts.path, 'v=' + image_version(asset), parts.fragment))


def version_css(source, parent, root):
    def replace(match):
        group = 'url' if match.group('url') is not None else 'import'
        start, end = match.span(group)
        return match.group(0)[:start-match.start()] + asset_url(match.group(group), parent, root) + match.group(0)[end-match.start():]
    return _css_without_comments(source, replace)


def _css_without_comments(source, replace):
    pieces = re.split(r'(/\*.*?\*/)', source, flags=re.S)
    return ''.join(piece if piece.startswith('/*') else CSS_REF.sub(replace, piece) for piece in pieces)


def version_html(source, root, page=None):
    """Preserve formatting, inline JS, navigation links, and external URLs."""
    root = root.resolve()
    parent = page.parent if page else root

    def replace(token):
        text = token.group(0)
        if text.startswith('<!--'):
            return text
        tag_match = re.match(r'<([a-z][a-z0-9-]*)\b', text, re.I)
        tag = tag_match.group(1).lower()
        opening_end = text.index('>') + 1
        opening = text[:opening_end]
        if tag == 'link' and not re.search(r'''\brel\s*=\s*["']stylesheet["']''', opening, re.I):
            return text
        attrs = {'script': {'src'}, 'link': {'href'}, 'img': {'src'}, 'audio': {'src'}, 'video': {'src', 'poster'}, 'source': {'src'}}.get(tag, set())
        def replace_attr(match):
            if match.group('name').lower() not in attrs:
                return match.group(0)
            return match.group('name') + match.group('eq') + match.group('quote') + asset_url(match.group('url'), parent, root) + match.group('quote')
        return ATTRIBUTE.sub(replace_attr, opening) + text[opening_end:]

    source = HTML_TOKEN.sub(replace, source)
    if THEME_MAP.search(source):
        themes = {p.parent.name: asset_url(p.relative_to(root).as_posix(), root, root) for p in sorted((root / 'themes').glob('*/theme.css'))}
        source = THEME_MAP.sub(lambda _: '/* generated theme URLs */\n      const themeStyles = ' + json.dumps(themes, indent=2) + ';\n      /* end theme URLs */', source)
    return source


def update_site(root):
    """Update dependency CSS first, then all entry pages. Detect CSS cycles."""
    root = root.resolve()
    changed = []
    visited, visiting = set(), set()

    def write(path, updated):
        original = path.read_text(encoding='utf-8')
        if original != updated:
            changed.append(path.relative_to(root).as_posix())
            # In check mode compute the expected tree in a temporary copy (see main).
            path.write_text(updated, encoding='utf-8')

    def css(path):
        path = path.resolve()
        if path in visiting:
            raise ValueError(f'Cyclic CSS import: {path.relative_to(root)}')
        if path in visited:
            return
        visiting.add(path)
        source = path.read_text(encoding='utf-8')
        for match in CSS_REF.finditer(re.sub(r'/\*.*?\*/', '', source, flags=re.S)):
            url = match.group('url') or match.group('import')
            parts = urlsplit(url)
            if not parts.scheme and not parts.netloc and parts.path.endswith('.css'):
                dep = ((root if parts.path.startswith('/') else path.parent) / unquote(parts.path).lstrip('/')).resolve()
                if not dep.is_relative_to(root) or not dep.is_file():
                    raise FileNotFoundError(f'Missing CSS dependency: {url}')
                css(dep)
        write(path, version_css(source, path.parent, root))
        visiting.remove(path)
        visited.add(path)

    for path in sorted(root.rglob('*.css')):
        if '.git' not in path.parts:
            css(path)
    for path in sorted(root.rglob('*.html')):
        if '.git' not in path.parts:
            write(path, version_html(path.read_text(encoding='utf-8'), root, path))
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify without modifying source files')
    args = parser.parse_args()
    if args.check:
        import shutil
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            copy = Path(tmp) / 'site'
            shutil.copytree(ROOT, copy, ignore=shutil.ignore_patterns('.git', '__pycache__'))
            changed = update_site(copy)
        if changed:
            print('Stale asset versions: ' + ', '.join(changed))
            print('Run: python3 scripts/update_preview_versions.py')
            return 1
        print('All site asset versions are up to date.')
    else:
        changed = update_site(ROOT)
        print('Updated asset versions: ' + (', '.join(changed) or 'already up to date'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
