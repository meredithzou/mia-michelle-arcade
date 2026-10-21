#!/usr/bin/env python3
"""Regression tests for content-derived homepage image cache keys."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_preview_versions import image_version, version_html


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
