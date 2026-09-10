# Working with Claude on this repo

This document explains how Claude Code is expected to work in
`VertexMaths` — what it does on its own, what it always leaves to a
human, and how it reports back. It applies to any Claude session
(interactive or automated) making changes here.

## Issue workflow

Claude fixes issues, but **never closes them.**

When a GitHub issue describes a bug or a requested feature:

1. Claude investigates, makes the fix (or builds the feature) on the
   project's working branch, and commits it with a clear message.
2. Claude tests the change — see "Testing" below — before considering
   the issue addressed.
3. Claude posts a comment on the issue that includes:
   - What was wrong (or what was missing).
   - What was changed, with the fix commit's SHA and file(s) touched.
   - The results of whatever testing was done (see below) — not just
     "tests passed," but what was actually checked and what the
     outcome was.
4. **Claude leaves the issue open.** A human reviews the fix — in the
   code, in the comment, or by trying the change themselves — and
   closes the issue once they're satisfied it's actually resolved.

Claude does not close, reopen, or change the state of an issue for
any reason. If Claude believes an issue is a duplicate, out of scope,
or otherwise shouldn't be actioned, it says so in a comment and waits
for a human decision instead of setting the issue's state itself.

## Testing

This project has no automated test suite (no build step, no test
runner) — verification is done by actually running the site. Before
reporting a fix as done, Claude should, as applicable:

- Serve the site locally (e.g. `python3 -m http.server`) and drive it
  with a headless browser (Playwright) to exercise the actual
  behavior that was fixed — clicking through the flow, filling in
  answers, checking computed values — rather than just reading the
  diff.
- Check the browser console for unexpected errors on every page
  touched by the change, and ideally on the full site as a
  regression check when the change touches shared code (`data.js`,
  `page-algebra.js`, shared CSS, shared JS helpers under `js/`).
- For adaptive/generated practice questions, verify more than one
  generated case (different random values, both branches of any
  order-independent answer, edge cases like repeated roots) rather
  than a single happy-path run.

Whatever was actually checked — pages loaded, inputs tried, pass/fail
counts, screenshots — gets summarized in the issue comment, so a
human reviewer can see what was verified without re-running it
themselves.

## Branching and commits

- Work happens on the repo's designated development branch for the
  session (not directly on the default branch), and is pushed there
  as it's completed.
- Commits are scoped to one logical unit of work (one bug fix, one
  new feature) with a message explaining *why*, not just *what*.
- Claude does not open a pull request unless explicitly asked to.

## Code conventions

New code should match the existing house style rather than
introducing a new pattern:

- Each view is a self-contained IIFE component on `window.VM`
  (`VM.SomeComponent = (function(){ ... return { init, start }; })();`),
  with a matching `page-*.js` composition root that wires its
  `onBack`/navigation callbacks to real page loads.
- Practice generators that scaffold difficulty follow the same
  adaptive pattern: below a minimum number of attempts or accuracy,
  show intermediate steps; above it, jump straight to the final
  scored step. Only the final step of a question is scored.
- Where a question has more than one structurally valid answer (e.g.
  factors in either order, either point substituted first), the
  check function accepts any valid form — it doesn't require the
  student to match one arbitrary canonical order.
- Hints describe the method, or use a small fixed example distinct
  from the current question — a hint must never be constructible
  into the current question's own expected-answer string.
- `js/data.js` is the single source of truth for topic names,
  statuses, and prerequisites; a topic's Learn/Practice buttons are
  enabled by adding `ready:true` there and, for Practice, adding an
  entry to `PRACTICE_PAGES` in `js/page-algebra.js`.
