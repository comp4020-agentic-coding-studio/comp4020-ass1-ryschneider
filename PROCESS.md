# Process overview

I built a software rasterizer explainer: one persistent scene, one canvas,
that stays live across seven accordion stages instead of six disconnected
demos. Stage 1 renders a table of "vertices" straight to screen pixels; each
later stage turns one more part of `screen = viewport(Projection * View *
Model * vertex)` from an identity default into something you can drag, while
every earlier control keeps acting on the same mesh(es) all the way to stage
7's Phong lighting. The math (mat4/vec3/camera/rasterizer) is ported from an
earlier prototype; the state machine, the seven stages, and the
reveal/engagement ratchets that make "everything stays live" true are new.

## The moments that mattered

1. **Pinning the one fact the whole pipeline depends on, before building on
   top of it.** Stage 1 claims a table vertex is rendered "directly to
   pixels," but that's really an ordinary orthographic matrix
   (`l=0,r=W,b=H,t=0`) whose swapped top/bottom cancels the Y-flip
   `ndcToScreen` always applies, a detail that's easy to get backwards and
   have "work" anyway for one test case. Rather than trust that by
   inspection, I wrote the numeric pin first: a vertex at `(10, 20, 0)` must
   land at screen pixel `(10, 20)` to float precision, committed alongside
   the matrix it's exercising
   ([`cbd172b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/cbd172b)).
   Every later stage's default (identity model, identity view, canvas-matched
   projection) is a statement that "this new matrix reduces to a no-op," and
   this test is what made that statement checkable instead of assumed.

2. **A screenshot said "uniform flat color everywhere," and the instinct was
   to start editing `shading.ts`.** Before touching the lighting code I read
   `pipeline.ts` and `shading.ts` end to end and the math was right: a fixed
   light direction dot-producted against differently-rotated face normals
   can't coincidentally produce one color across a whole cube and a
   triangle. The actual cause was outside the code: a stale, never-reloaded
   browser tab from earlier ad-hoc testing plus a camera angle that only
   showed one dominant face. A fresh reload with a clearer oblique angle
   showed correct, distinctly-shaded faces immediately. The check that
   mattered wasn't a new test, it was refusing to trust a single
   screenshot's "looks broken" over reading the math that produces it, and
   then re-testing under controlled conditions before believing either
   verdict.

3. **Splitting one messy diff into three honest commits instead of one
   "fix bugs" commit.** Chasing that shading question left `actions.ts` with
   three unrelated fixes tangled together: pixel-scale near/far defaults,
   newly-added meshes spawning invisibly at the world origin instead of the
   camera's target, and a stage-5 "mesh color" control that only wrote a
   record nobody read. Since I couldn't stage hunks interactively, I
   reverted two of the three fixes with the Edit tool, committed the first
   alone, then re-applied and committed each of the others in turn
   ([`57418f3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/57418f3),
   [`f7ff275`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/f7ff275),
   [`df2e9bc`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/df2e9bc)).
   The extra care was for the reader of the history, not the code: three
   commits that each answer "what changed and why" beat one that requires
   re-deriving three separate stories from a combined diff.

4. **A dead end the acceptance checklist wouldn't have caught.** Testing
   resize-mid-interaction in a real browser, I clicked stage 2's Perspective
   radio directly (not via the "load example" button) and the canvas went
   solid black, no error, no test failure, nothing in `pnpm check`. Reading
   `pipeline.ts`, the cause was structural: an identity view means the
   camera coincides with the table's `z=0` vertices, so the perspective
   divide (`w = -z`) hits exactly zero and every vertex fails the `clip.w <=
   0` check. That's the same degeneracy the plan had already named for
   `orbitView(0,0,0)`: perspective without a positioned camera has no
   sensible default, same as an orbit camera with itself as its own target,
   so the fix extends the existing view-engagement ratchet rather than
   inventing a new mechanism: choosing perspective now engages the view with
   its already-sensible defaults if it isn't engaged yet
   ([`a95f2c4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-ryschneider/commit/a95f2c4)).
   Found by using the deployed-shaped artefact the way a grader would,
   clicking a control in isolation, not by re-running the automated suite.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there --- before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.

Images are deliberately not checked, because whether one renders is visible the
moment you look. Open this file on GitHub and look at it before you ship.
