# Vertex Maths

A Year 11 maths practice site: a home screen with a strand picker, an
Algebra & Graphing prerequisite diagram (skills laid out as a DAG,
click a skill to trace what it needs), and a handful of working
Learn/Practice question generators.

Static HTML/CSS/JS, no build step and no dependencies — open
`index.html` in a browser, or serve the folder with any static file
server (e.g. `python3 -m http.server`).

## Structure

- `index.html` — page markup for every view (home, the algebra DAG,
  and each Practice screen).
- `css/` — `base.css` (tokens, reset, shared chrome), then one
  stylesheet per view (`home.css`, `dag.css`, `practice.css`).
- `js/` — `data.js` is the content model (skill names, statuses,
  prerequisites); `toast.js`, `equation-parse.js` and `graph-utils.js`
  are small shared utilities; `home-view.js`, `dag-view.js` and the
  three `practice-*.js` files are the view components; `app.js` is
  the composition root that wires everything together and switches
  between views.

Edit `js/data.js` to change a skill's name, status, or prerequisites
— everything else (the diagram layout, the Learn/Practice buttons)
follows from that data.
