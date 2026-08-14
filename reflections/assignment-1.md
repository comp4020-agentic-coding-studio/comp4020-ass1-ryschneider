# Assignment 1 reflection

**The breakthrough.** I'd planned the seven stages around one architectural
idea: every stage is the same formula, `screen = viewport(Projection * View *
Model * vertex)`, and a stage "exists" only by turning one factor from an
identity default into something editable — never by branching the renderer.
The breakthrough was realizing that identity isn't always a safe default:
`orbitView(0,0,0)` is degenerate (eye equals target), so view needed an
explicit engagement ratchet before the plan even had code. What I hadn't
predicted was a second instance of the exact same problem — perspective
projection with an *unengaged* view is just as degenerate, since z=0 vertices
sit exactly at the eye. Finding that live, as a plain black canvas with no
error anywhere in `pnpm check`, and recognizing it as the same shape of bug
rather than a new one, was the moment the architecture actually clicked
instead of just reading as clean on paper.

**What it changed.** I trusted a screenshot too quickly once — "uniform lit
color everywhere" looked like a shading bug, and I nearly started editing
`shading.ts` before rereading the math and finding nothing wrong there. It
turned out to be stale browser state, not stale code. That cost me time I
didn't get back, and it's changed how I sequence verification: read the
implementation and convince myself of a hypothesis *before* trusting a single
rendered frame, especially in a tool loop where a browser tab can silently
survive several edits behind the code driving it.
