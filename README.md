# Vertex Maths

A Year 11 maths practice site: a home screen with a strand picker, an
Algebra & Graphing prerequisite diagram (skills laid out as a DAG,
click a skill to trace what it needs), and a handful of working
Learn/Practice question generators.

Static HTML/CSS/JS, no build step and no dependencies — open
`index.html` in a browser, or serve the folder with any static file
server (e.g. `python3 -m http.server`).

## Pages

- `index.html` — home screen (resume card + strand picker).
- `algebra.html` — the Algebra & Graphing prerequisite diagram.
  Accepts an optional `?topic=<id>` query param (used by the home
  page's Resume button) to focus a skill's prerequisite chain on load.
- `practice-line-graph.html` — Practice: finding a line's equation
  from a graph.
- `practice-parabola-intercepts.html` — Practice: finding a
  parabola's equation from its intercepts.
- `practice-parabola-vertex.html` — Practice: finding a parabola's
  equation from its vertex.
- `practice-line-from-table.html` — Practice: finding a line's
  equation from a table of values.
- `practice-simultaneous.html` — Practice: solving simultaneous
  equations, alternating between the elimination and substitution
  methods.
- `practice-parabola-from-table.html` — Practice: finding a
  parabola's equation from a table, via first and second differences.
- `practice-exp-from-table.html` — Practice: finding an exponential's
  equation from a table, via first differences and their ratio.

Each page links to the next with a plain `<a href>`/back button —
there's no client-side router.

## Structure

- `css/` — `base.css` (tokens, reset, shared page chrome), then one
  stylesheet per view (`home.css`, `dag.css`, `practice.css`).
- `js/` — `data.js` is the content model (skill names, statuses,
  prerequisites); `toast.js`, `equation-parse.js` and `graph-utils.js`
  are small shared utilities; `home-view.js`, `dag-view.js` and the
  seven `practice-*.js` files are the view components, each taking
  navigation callbacks rather than knowing about pages directly; the
  matching `page-*.js` file is that page's composition root, wiring
  the view component's callbacks to an actual page navigation
  (`window.location.href = '...'`).

Edit `js/data.js` to change a skill's name, status, or prerequisites
— everything else (the diagram layout, the Learn/Practice buttons)
follows from that data.
