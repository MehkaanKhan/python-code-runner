# Python Code Runner

**Live site:** https://mehkaankhan.github.io/python-code-runner/

A beginner-friendly, browser-based Python playground for kids aged 11–13. Students
type Python into an editor, hit **Run**, and see output — with any error translated
into a short, plain-language explanation instead of a raw traceback.

A lightweight backend logs fully anonymous usage counts (sessions, runs, which kind
of error was hit) so a teacher/admin can spot common mistakes across a class. No
accounts, no saved code, no personal data of any kind is ever collected.

## How it works

- **Frontend** (`frontend/`) — plain HTML/CSS/JS, no build step. Python runs
  entirely client-side via [Pyodide](https://pyodide.org) (WASM Python) — nothing
  is sent to any server to execute code. The editor is [CodeMirror](https://codemirror.net/5/).
- **Backend** (`backend/`) — a small Node/Express + SQLite API that only ever
  receives: event type (`session_start` / `run_pressed`), an error category (or
  none), an anonymous per-tab session id, and a timestamp. No names, no IP
  logging, no identifying info.

## Running it locally

You'll need [Node.js](https://nodejs.org/) (v18+) installed. No Python install is
needed — Pyodide runs Python in the browser.

**1. Start the backend** (from the `backend/` folder):

```bash
cd backend
npm install
node server.js
```

This starts the API on `http://localhost:3000`, bound to `localhost` only (not
exposed on your network). It creates `backend/data/events.db` automatically on
first run.

**2. Serve the frontend** (from the `frontend/` folder, in a separate terminal).
The frontend just needs to be served as static files — any static server works,
for example:

```bash
cd frontend
npx serve -l 5500
# or: python -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

> The frontend and backend can run on any two different local ports — the
> frontend is hardcoded to talk to `http://localhost:3000` (see
> `frontend/js/config.js`) if you need to change the backend's port.

## Viewing usage stats

With the backend running, open **`http://localhost:3000/admin`** in a browser.
It shows total sessions, total runs, successful runs, and a breakdown of error
types encountered — no login required (it's only meant to be reachable on your
own machine).

To pull the same data into a spreadsheet or another tool:

- `http://localhost:3000/api/export.csv` — downloads a CSV file
- `http://localhost:3000/api/export.json` — returns the same data as JSON

## How errors are shown

Instead of a raw traceback, a small marker appears right at the end of the line
that caused the problem: `<-- Oops, you missed something? [Hint]`. Clicking
**Hint** reveals a guiding clue without giving the fix away; clicking the
**Want to see the answer?** button that appears next reveals the specific fix —
naming the exact bracket, quote mark, variable name, or number of spaces
involved wherever possible (e.g. "You opened with `(` but never added the
matching `)`.").

## Error categories tracked

| Category | What triggers it |
|---|---|
| `indentation_error` | Inconsistent indentation, missing indent after `:`, or unexpected indent — message states exact spaces off where possible |
| `syntax_error_colon` | Missing `:` after `if`/`for`/`def`/etc. |
| `syntax_error_bracket` | Unclosed, extra, or mismatched `()`/`[]`/`{}` — names the exact bracket |
| `syntax_error_quote` | An unclosed `'` or `"` string — names the exact quote character |
| `syntax_error_other` | Any other syntax error, using Python's own suggestion when available (e.g. "forgot a comma") |
| `name_error` | Using a variable that was never created (likely typo) — names the exact variable |
| `type_error_str_int` | Mixing a number and text (e.g. `"age: " + 5`) |
| `type_error_other` | Other type mismatches (calling a non-function, wrong argument count, etc.) |
| `value_error` | A value that isn't in the format expected (e.g. `int("banana")`) |
| `index_error` | Accessing a list position that doesn't exist |
| `key_error` | Accessing a dictionary key that doesn't exist — names the exact key |
| `zero_division_error` | Dividing by zero |
| `attribute_error` | Using a method that doesn't exist on that type of value — names the exact attribute |
| `import_error` | Importing a module that can't be found — names the exact module |
| `naming_convention` | Non-idiomatic naming (e.g. `CamelCase` variables) — flagged even though it's not a real Python error |
| `other_error` | Any other exception not covered above, shown with a generic simplified message |

## Restyling with your design

All layout/visual styling lives in `frontend/css/style.css`, and the markup in
`frontend/index.html` uses plain, semantic classes. Once you have a mockup or
Figma export, that CSS file (plus minor markup tweaks) is the only thing that
needs to change — the editor, execution, error translation, and tracking logic
are all independent of styling.

## Deploying it somewhere

This is a two-piece app, so it deploys as two pieces:

- **Frontend** (static files, no server needed): already deployed to
  [GitHub Pages](https://mehkaankhan.github.io/python-code-runner/) via the
  workflow at `.github/workflows/deploy-pages.yml`, which redeploys
  automatically on every push that touches `frontend/`. [Netlify](https://netlify.com),
  [Vercel](https://vercel.com), or [Cloudflare Pages](https://pages.cloudflare.com)
  are equally good free alternatives if you'd rather not use Pages.
- **Backend** (small Node app + SQLite file) — not yet deployed anywhere, so
  usage tracking on the live site above is currently inert (the frontend still
  points at `http://localhost:3000`, see below). Options: [Render](https://render.com),
  [Fly.io](https://fly.io), or [Railway](https://railway.app) all offer
  cheap/free tiers for a small Node service. Note: SQLite needs a *persistent*
  disk — some free tiers use ephemeral storage that resets on redeploy, so check
  that before relying on long-term stat history, or upgrade to a tier with a
  persistent volume.
- If you do deploy the backend somewhere reachable by others, add basic auth (or
  an IP allowlist) in front of `/admin` first — right now it deliberately has no
  login, since it's designed to only run locally/on a trusted network.

Update `API_BASE` in `frontend/js/config.js` to point at your deployed backend
URL once both pieces are hosted.
