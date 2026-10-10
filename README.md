# LogMind AI — browser-only demo

The Firebase frontend runs entirely in your browser. It makes no requests to Render or the optional Python backend.

Available: .log/.txt parsing (2 MB / 10,000 lines), filtering, rule-based incident grouping and priorities, historical demo recommendations, reports, and the payment failure demo. Data stays in browser storage when available. Existing local demo data remains compatible. Browser storage can fill up or be cleared, and mock accounts are not real authentication.

Unavailable publicly: cloud AI / sentence-transformer grouping, Supabase analysis saves and retrieval, and server-side Python analysis. Those require a separately hosted backend. Local rule-based results must not be described as cloud AI results.

## Frontend

```sh
npm ci
npm test
npm run build
npm run dev
```

For a production preview: `npm run preview`.

## Optional local FastAPI

The original AI grouping code is preserved. Run it independently through its local API docs; the static website does not connect to it.

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

Open http://127.0.0.1:8001/docs. Dependencies and the model may require downloads; computation uses your computer. No cloud service registration is needed. Supabase is disabled by default. Only if deliberately using your existing Supabase account, copy `.env.example` to `.env`, set `ENABLE_SUPABASE=true`, and configure credentials locally. Never put secrets in VITE_* variables, React code, GitHub, or Firebase assets. Do not expose this unauthenticated development backend publicly.

## Firebase deployment — approval required

Build and review first. The existing target is project `logmind-ai`, site `logmind-ai.web.app`. Only `dist/` is deployed by `firebase.json`; Python code and environment files are excluded. No Functions or paid services are needed.

After permission and with a valid Firebase login:

```sh
firebase deploy --only hosting --project logmind-ai
```

## Render removal — confirmation required

In your Render dashboard, select the web service and verify its URL is exactly `https://logmind-ai-1s81.onrender.com`. Confirm the service name and service ID before deleting it. Delete only that web service, not the workspace or unrelated resources. Deletion removes the deployment and service configuration; preserve anything needed first. Check the service has disappeared afterward. Existing charges or other billable resources require a separate billing check.

No Render service has been deleted by preparing this code.
