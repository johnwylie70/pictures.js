# Changes

## 0.1.0 (2026-10-10)

First release.

- A scene is one plain `.js` file with `setup()`, `update(dt)` and `draw()`, and nothing to import.
- Plain drawing functions (`background`, `circle`, `rect`, `line`, `text`, `picture` and more), the web's 2D canvas as `ctx`, and three.js as `THREE` for 3D.
- `keys`, `mouse`, `touches` and `pinch` for input, and `Sprite` for moving pictures that can tell when they touch.
- `save("best", 120)` keeps a value for the next time the program runs, and `load("best", 0)` gives it back.
- A mistake names its line, in Chrome and in Safari, on iPad and iPhone too: one made while the scene runs, one in a file loaded with `use()`, and a `{`, `(` or `[` that is never closed.
- `pictures run scene.js` opens a scene in your browser and runs it again when you save. `pictures build scene.js -o site/` makes a folder of plain files for any static host.
- The same shape of program as [Pyctures](https://github.com/johnwylie70/pyctures), its Python sibling, with the same examples under the same names.
