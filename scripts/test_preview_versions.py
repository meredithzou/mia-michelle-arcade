#!/usr/bin/env python3
"""Regression tests for content-derived site asset cache keys."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import contextlib
import io
import update_preview_versions as versions

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_preview_versions import image_version, version_html, update_site


class HomepageImageVersionTests(unittest.TestCase):
    """Check deterministic hashes, updates, unchanged HTML, and bad inputs."""

    def setUp(self):
        """Create a tiny standalone static-site fixture for each test."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "assets").mkdir()
        self.asset = self.root / "assets" / "example.png"
        self.asset.write_bytes(b"first screenshot")

    def test_versioning_is_deterministic_and_idempotent(self):
        """Every local image gets one key; rerunning doesn't change the HTML."""
        source = (
            '<img src="assets/example.png" alt="Game">'
            '<img src="https://example.org/remote.png" alt="Remote">'
            '<a href="assets/example.png">View image</a>'
        )
        updated = version_html(source, self.root)
        self.assertIn(f'assets/example.png?v={image_version(self.asset)}', updated)
        self.assertIn('src="https://example.org/remote.png"', updated)
        self.assertIn('<a href="assets/example.png">', updated)
        self.assertEqual(updated, version_html(updated, self.root))

    def test_replacing_image_changes_url_not_filename(self):
        """Changing only the binary bytes forces a new URL for Safari."""
        source = '<img src="assets/example.png" alt="Game">'
        first = version_html(source, self.root)
        self.asset.write_bytes(b"new screenshot bytes")
        second = version_html(first, self.root)
        self.assertNotEqual(first, second)
        self.assertIn('src="assets/example.png?v=', second)

    def test_stylesheet_content_change_invalidates_cache(self):
        (self.root / "styles").mkdir()
        css = self.root / "styles/home.css"
        css.write_text(".icon { width:24px }")
        source = '<link rel="stylesheet" href="styles/home.css"><link rel="preload" href="styles/home.css">'
        first = version_html(source, self.root)
        self.assertEqual(first, version_html(first, self.root))
        self.assertIn('<link rel="preload" href="styles/home.css">', first)
        css.write_text(".icon { width:27px }")
        second = version_html(first, self.root)
        self.assertNotEqual(first, second)
        self.assertIn(f'styles/home.css?v={image_version(css)}', second)


    def test_theme_configuration_change_invalidates_cache(self):
        (self.root / "analytics").mkdir()
        analytics = self.root / "analytics/config.js"
        analytics.write_text("// analytics")
        config = self.root / "site-config.js"
        config.write_text('window.ARCADE_CONFIG = { activeTheme: "pastel-rainbow" };')
        source = '<script src="site-config.js"></script><script src="analytics/config.js"></script>'
        first = version_html(source, self.root)
        self.assertEqual(first, version_html(first, self.root))
        self.assertIn(f'<script src="analytics/config.js?v={image_version(analytics)}"></script>', first)
        config.write_text('window.ARCADE_CONFIG = { activeTheme: "halloween" };')
        second = version_html(first, self.root)
        self.assertNotEqual(first, second)
        self.assertIn(f'site-config.js?v={image_version(config)}', second)

    def test_nested_css_and_theme_image_propagate_to_page(self):
        theme = self.root / "themes/halloween"
        theme.mkdir(parents=True)
        image = theme / "ghost.svg"
        image.write_text("first ghost")
        child = theme / "child.css"
        child.write_text('body { background:url("ghost.svg#icon") }')
        parent = theme / "theme.css"
        parent.write_text('@import "child.css";')
        page = self.root / "index.html"
        page.write_text('<link rel="stylesheet" href="themes/halloween/theme.css"><script>/* generated theme URLs */const themeStyles={};/* end theme URLs */</script>')
        update_site(self.root)
        first = page.read_text()
        self.assertIn(f'themes/halloween/theme.css?v={image_version(parent)}', first)
        self.assertIn(f'child.css?v={image_version(child)}', parent.read_text())
        self.assertIn(f'ghost.svg?v={image_version(image)}#icon', child.read_text())
        self.assertEqual(update_site(self.root), [])
        image.write_text("changed ghost")
        changed = update_site(self.root)
        self.assertEqual(set(changed), {"themes/halloween/child.css", "themes/halloween/theme.css", "index.html"})
        self.assertNotEqual(page.read_text(), first)
        self.assertEqual(update_site(self.root), [])

    def test_shared_script_versions_match_across_pages(self):
        (self.root / "shared").mkdir()
        script = self.root / "shared/input.js"
        script.write_text("// shared input")
        for name in ("a", "b"):
            folder = self.root / "games" / name
            folder.mkdir(parents=True)
            (folder / "index.html").write_text('<script src="../../shared/input.js?v=mic-config-2"></script>')
        update_site(self.root)
        for page in (self.root / "games").rglob("*.html"):
            self.assertIn(f'input.js?v={image_version(script)}', page.read_text())
        script.write_text("// new input")
        self.assertEqual(len(update_site(self.root)), 2)
        self.assertEqual(update_site(self.root), [])

    def test_inline_scripts_comments_navigation_and_external_urls_stay_intact(self):
        source = ('<script>const example = \"<img src=\"missing.png\">\";</script>'
                  '<!-- <img src="missing.png"> -->'
                  '<a href="missing.html">Navigate</a>'
                  '<script src="https://example.org/pinned.js?v=1"></script>')
        self.assertEqual(version_html(source, self.root), source)

    def test_check_reports_stale_tree_without_writing_it(self):
        page = self.root / "index.html"
        page.write_text('<img src="assets/example.png">')
        before = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        with patch.object(versions, "ROOT", self.root), patch.object(sys, "argv", ["versions", "--check"]), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(versions.main(), 1)
        after = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        update_site(self.root)
        with patch.object(versions, "ROOT", self.root), patch.object(sys, "argv", ["versions", "--check"]), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(versions.main(), 0)

    def test_cycles_and_out_of_root_assets_fail(self):
        (self.root / "a.css").write_text('@import url("b.css");')
        (self.root / "b.css").write_text('@import url("a.css");')
        with self.assertRaises(ValueError):
            update_site(self.root)
        with self.assertRaises(FileNotFoundError):
            version_html('<script src="../outside.js"></script>', self.root)

    def test_missing_image_fails(self):
        """Prevent publishing a version key for a nonexistent preview."""
        with self.assertRaises(FileNotFoundError):
            version_html('<img src="assets/missing.png">', self.root)

    def test_unrelated_image_queries_are_not_discarded(self):
        """Fail rather than overwrite an image URL with other parameters."""
        with self.assertRaises(ValueError):
            version_html('<img src="assets/example.png?size=small">', self.root)


if __name__ == "__main__":
    unittest.main()
