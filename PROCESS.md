# Process overview

I built a software rasterizer explainer: one persistent scene, one canvas,
that stays live across seven accordion stages instead of six disconnected
demos. Stage 1 renders a table of "vertices" straight to screen pixels; each
later stage turns one more part of `screen = viewport(Projection * View *
Model * vertex)` from an identity default into something you can drag, while
every earlier control keeps acting on the same mesh(es) all the way to stage
7's Phong lighting.

This is the third attempt at the idea. The first
([`98dfabf`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/98dfabf))
was a six-stage scrollytelling article walking the same formula as schematic
diagrams over a static mesh -- readable, but nothing on the page was live.
The second
([`ad003b4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/ad003b4))
tried converting that article in place into an interactive WebGL2 game; it
stalled after stage 1 and was abandoned. This build starts over from the
initial commit, keeping only the raster math (ported wholesale --
[`243ad48`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/243ad48))
and rebuilding everything about how the pipeline is presented: the state
machine, the seven stages, and the engagement ratchets that make "everything
stays live" true are new.

## The moments that mattered

1. **Pinning the one fact the whole pipeline depends on, before building on
   top of it.** Stage 1 claims a table vertex is rendered "directly to
   pixels," but that's really an orthographic matrix (`l=0,r=W,b=H,t=0`)
   whose swapped top/bottom cancels the Y-flip `ndcToScreen` always applies --
   a detail easy to get backwards and have "work" by accident. Rather than
   trust that by inspection, I wrote the numeric pin first: a vertex at
   `(10, 20, 0)` must land at screen pixel `(10, 20)` to float precision,
   committed alongside the matrix it exercises
   ([`cbd172b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/cbd172b)).
   Every later stage's identity default is a claim that "this new matrix is a
   no-op," and this test is what made that claim checkable.

2. **A dead end the acceptance checklist wouldn't have caught.** Clicking
   stage 2's Perspective radio directly (not the "load example" button) turned
   the canvas solid black, no error, `pnpm check` green throughout. Reading
   `pipeline.ts`, the cause was structural: an identity view puts the camera
   at the table's `z=0` vertices, so the perspective divide (`w=-z`) hits
   exactly zero and every vertex fails the clip check -- the same degeneracy
   already named for `orbitView(0,0,0)`. The fix extends the existing
   view-engagement ratchet rather than inventing a second mechanism: choosing
   perspective now engages the view with its defaults if it isn't engaged yet
   ([`a95f2c4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/a95f2c4)).

3. **A failing test that pointed past the code it was written to check.** A
   "fit everything into view" feature needs the camera to look at an
   arbitrary point, not the origin. Its tests failed with wildly
   out-of-range NDC values even though a debug dump matched my hand-derived
   near/far/distance arithmetic exactly. Reading `camera.ts` instead of
   re-deriving the arithmetic again found the bug one layer down: `orbitEye`
   always orbited the world origin, never `view.target`
   ([`5e5db50`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/5e5db50)).
   No existing test asserted eye position relative to a non-origin target, so
   this was a correctness fix the manual testing of six prior stages had
   never exercised.

4. **A CSS bug two layers deep, from the other half of this build.** Hint
   tooltips clipped whenever they needed to overflow past a stage panel onto
   the canvas. The obvious fix, `position: fixed`, doesn't work here:
   `.stage-panels`'s `overflow-y: auto` forces `overflow-x` to clip too, and
   `.stage`'s `backdrop-filter` creates a containing block that defeats a
   naive fixed position anyway. The fix instead portals the tooltip to
   `document.body`, positions it in JS via `getBoundingClientRect`, and swaps
   CSS `:hover`/`:focus-within` for delegated pointer/focus events on
   `document`
   ([`1b17fe7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/1b17fe7))
   -- landed by a parallel session refining the same build while this file
   was being written.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there --- before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.

Images are deliberately not checked, because whether one renders is visible the
moment you look. Open this file on GitHub and look at it before you ship.
