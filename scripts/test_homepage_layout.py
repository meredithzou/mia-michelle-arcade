#!/usr/bin/env python3
"""Prevent game cards from being accidentally inserted into the hero banner."""
from pathlib import Path
import unittest
from check_site import CardParser


class GameCardPlacementTests(unittest.TestCase):
    """Exercise section nesting and the real published card order."""

    def parse(self, source):
        """Parse cards without depending on their content or game names."""
        parser = CardParser()
        parser.feed(source)
        return parser.cards

    def test_hero_and_unsectioned_cards_are_rejected(self):
        """Catch both a banner card and a card outside any game grid."""
        for source in (
            '<section class="hero"><article class="card"></article></section>',
            '<article class="card"></article>',
            '<section class="hero"><section class="grid"><article class="card"></article></section></section>',
        ):
            self.assertFalse(self.parse(source)[0]["in_game_grid"])

    def test_nested_section_preserves_grid_parent(self):
        """Nested sections and previous hero sections must not confuse placement."""
        cards = self.parse(
            '<section class="hero"></section><section class="grid">'
            '<section><article class="card"></article></section>'
            '<article class="card"></article></section>'
        )
        self.assertTrue(all(c["in_game_grid"] for c in cards))

    def test_published_finder_is_last_in_grid(self):
        """Verify the exact placement requested for Piano Note Finder."""
        source = (Path(__file__).resolve().parent.parent / "index.html").read_text()
        cards = self.parse(source)
        self.assertTrue(all(c["in_game_grid"] for c in cards))
        self.assertIn("games/piano-note-finder/index.html", cards[-1]["links"])
        self.assertEqual(sum("games/piano-note-finder/index.html" in c["links"] for c in cards), 1)


if __name__ == "__main__":
    unittest.main()
