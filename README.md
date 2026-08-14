# Resume Agent

Local FastAPI + React app: edit your profile, compile a LaTeX resume to PDF, tailor it to a job description, and rank the match with OpenRouter (`nvidia/nemotron-3.5-lightning:free`).

## Prerequisites

- Python 3.9+ (3.11+ preferred)
- Node.js 20+
- [Tectonic](https://tectonic-typesetting.github.io/) for PDF compile: `brew install tectonic`
- `OPENROUTER_API_KEY` in `.env`. Optional: `OPENROUTER_MODEL`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
```

## Run

Terminal 1:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

If **Tailor** / **Rank** returns OpenRouter 403: run the API in a normal terminal (so it can reach the internet), confirm `.env` has `OPENROUTER_API_KEY`, and at https://openrouter.ai/settings/privacy allow free-model providers (turn **ZDR-only** off).

- `/` — admin profile editor
- `/resume` — PDF preview and downloads
- `/match` — paste a JD, tailor, rank, optionally save tailored version as the profile
