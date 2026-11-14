# Build-a-World!

A touch-friendly creative building game for Mia and Michelle's Arcade.

## Play

- Tap a block in the Building or Nature + fun palette, then tap or drag on the canvas to place pieces.
- Use **Rebuild** to clear every block (after confirmation); **Undo** restores the prior world.
- Use **Surprise Me!** to generate one of six randomized creations. Repeated taps yield a new design, and Undo restores the previous one.
- Choose a Cozy house, Magic castle, Treehouse, or Empty world starter.
- Change day/night, celebrate, erase, undo/redo, and save the canvas as a PNG.

The game logic needs no libraries or network resources. The local browser saves the current world and time-of-day choice under `mia-build-a-world-v1`; creations are not uploaded. The site loads the Arcade's standard aggregate analytics scripts. The navigation link uses `../../shared/arcade-nav.css` so it scrolls away with the page instead of floating over the building canvas.

The homepage preview at `../../assets/build-a-world-preview.png` was rendered from the game's own canvas and contains no navigation or surrounding page chrome.
