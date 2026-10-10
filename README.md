# LogMind AI

**Finding the signal in 10,000 log lines at 3 a.m.**

[![Live demo](https://img.shields.io/badge/Live%20demo-Firebase%20Hosting-ffca28)](https://logmind-ai.web.app/) [![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)](https://react.dev/)

**LogMind AI** is an interactive log-investigation and incident-response prototype created for a hackathon. It helps an on-call engineer turn noisy application logs into searchable events, prioritized incident groups, and evidence-backed next steps.

**[Open the live demo](https://logmind-ai.web.app/)** · **[View source](https://github.com/XYZ-4444/LogMind-Ai)**

> **Current deployment:** The Firebase website is **browser-only**. It runs JavaScript log parsing, *rule-based* incident grouping and prioritization, and local historical-case matching. Python semantic/ML grouping is preserved as an **optional local backend**, not part of the publicly hosted website. The public demo does not use Render or save analyses to Supabase.

## The problem

At 3 a.m., an on-call engineer may receive thousands of repetitive events while an application is failing. Manually scanning logs makes it difficult to determine which errors matter, which services are affected, what happened first, and what to investigate next.

LogMind AI explores a workflow that helps engineers **upload → inspect → group → prioritize → investigate → document**.

## Features in the browser demo

- **Log Explorer:** upload `.log` or `.txt` files; accepts plain text and JSON Lines, with timestamps, levels, and service identifiers when present.
- **Log filtering:** search by message, service, severity, category, incident group, and time range; sort and paginate results.
- **Incident Center:** deterministic, rule-based grouping of error patterns and a transparent P0–P3 priority score based on observed severity, frequency, affected services, and timing.
- **Investigations:** examine the incident timeline, related log entries, evidence, notes, status, and assignee.
- **Historical recommendations:** compare current incidents with resolved demo cases and display possible causes and runbook-style actions. Suggested causes are **hypotheses**, not verified diagnoses.
- **Overview and reports:** dashboard metrics, charts, service health, historical analysis, and CSV exports.
- **Demo scenarios:** fictional organization workspaces and a payment-failure demonstration.
- **Browser persistence:** workspace state is stored locally when browser storage is available; it may be lost if the user clears browsing data.

### Demo limits

| Limit | Browser demo |
| --- | --- |
| Input types | `.log`, `.txt` (plain text or JSON Lines) |
| Maximum upload size | 2 MB per file |
| Maximum lines | 10,000 non-empty lines per file |
| Workspace storage cap | 20,000 log entries per organization |
| Cloud ML inference | Not available on the public Firebase site |
| Cloud database storage | Not available on the public Firebase site |
| Authentication | **Mock/demo accounts only** in the currently published repository |

These are limits and behaviors of the current code, **not** measured performance guarantees.

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19, JavaScript, CSS |
| Development/build | Vite 6 |
| Charts | Recharts |
| Icons | Lucide React |
| Browser-side analysis | Custom parser, normalized error categories, rule-based ranking and similarity matching |
| Frontend hosting | Firebase Hosting |
| Optional **local** API | Python, FastAPI, Uvicorn |
| Optional **local** semantic grouping | Sentence Transformers (`all-MiniLM-L6-v2`) and scikit-learn |
| Optional database integration | Supabase, **disabled by default** |

### Architecture

```text
Firebase Hosting: live browser demo
    |
    v
React / Vite UI
    |
    +--> Read local .log or .txt file (FileReader)
    +--> Parse and normalize log entries
    +--> Rule-based incident grouping + priority scoring
    +--> Demo historical matching / recommendations
    +--> Browser storage and reports

Separate optional local development path (NOT connected to the public UI):
    FastAPI POST /analyze
        +--> Sentence Transformers + clustering
        +--> Priority, affected-service and root-cause suggestions
        +--> Optional Supabase summary insert (when explicitly enabled)
```

## Run the frontend locally

**Prerequisites:** Node.js and npm.

```bash
git clone https://github.com/XYZ-4444/LogMind-Ai.git
cd LogMind-Ai
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The current application provides demo accounts and fictional workspaces for exploration; these **do not represent secure authentication**.

Useful commands:

```bash
npm test                  # Run available JavaScript tests
npm run test:render       # Render-based component sanity check
npm run build             # Create production dist/ folder
npm run preview           # Preview the production build locally
npm run build:standalone  # Regenerate the standalone LogMind AI.html file
```

To try the main workflow, open **Log Explorer**, select a small synthetic `.log` file, choose **Analyze Logs**, and inspect the Incident Center and AI Solutions (historical demo recommendations).

## Optional: run the Python AI API locally

The Python backend is retained for **local development and experiments**. It is not necessary to use the Firebase website. Its ML dependencies can require substantial memory and an initial model download.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

Open **http://127.0.0.1:8001/docs** to test:

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Local API health check |
| `POST /analyze` | Upload and analyze a `.log` or `.txt` file (up to 5 MB) |
| `GET /analyses` | Read saved analysis summaries when Supabase is enabled; otherwise returns a disabled/empty response |

For optional Supabase use, copy `backend/.env.example` to `backend/.env` and configure it **only on your own computer**:

```dotenv
ENABLE_SUPABASE=false
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

Leave `ENABLE_SUPABASE=false` unless you specifically need database saving. Never commit `.env`, service-account credentials, or Supabase secret keys. **Do not expose this development API publicly without authentication, access controls, and appropriate rate limits.**

## Deploy the browser-only frontend to Firebase Hosting

The committed `firebase.json` serves the Vite `dist/` directory and uses a single-page-app rewrite.

```bash
npm ci
npm run build
firebase login
firebase deploy --only hosting --project logmind-ai
```

The public site is **https://logmind-ai.web.app/**. Hosting the static React application does **not** deploy Python/FastAPI or enable semantic ML analysis in visitors' browsers.

## Project layout

```text
LogMind-Ai/
├── src/
│   ├── main.jsx           # React entry + error boundary
│   ├── App.jsx            # Demo sign-in, workspace shell, navigation
│   ├── engine.js          # Parser, grouping, ranking, demo fixtures
│   ├── storage.js         # Browser-local workspace/session storage
│   ├── components.jsx     # Shared UI, charts and solution panels
│   ├── investigation.jsx  # Log explorer and investigation views
│   ├── management.jsx     # Reports and organization/demo views
│   ├── SavedAnalyses.jsx  # Browser-only mode notice
│   └── styles.css         # Site styling
├── backend/
│   ├── main.py            # Optional FastAPI application
│   ├── ai_grouping.py     # Optional semantic grouping + suggestions
│   ├── database.py        # Optional Supabase client
│   ├── .env.example       # Example backend environment variables
│   └── requirements.txt   # Python dependencies
├── public/                # Static assets, including favicon
├── scripts/               # Standalone HTML build script
├── index.html             # Vite HTML entry
├── firebase.json          # Firebase Hosting config
├── .firebaserc            # Firebase project alias
├── package.json
└── README.md
```

`LogMind AI.html` is a generated standalone HTML build that can be regenerated with `npm run build:standalone`; `index.html` contains a fallback for opening the project using `file://`. The checked-in `logmind-ai-source.zip` looks like a source snapshot rather than a build requirement; verify its contents before removing it.

## Known limitations and security

- **Browser-only prototype:** the public app uses rule-based analysis, not hosted Sentence Transformers. The **AI Solutions** page contains historical/demo suggestions rather than newly generated LLM responses.
- **Mock authentication:** the repository currently uses public demo credentials and browser-stored sessions; it does not enforce real Firebase Authentication or secure tenant separation.
- **Local storage:** all demo data can be lost or become inaccessible when browser storage is cleared or fills up. No cross-device synchronization is provided.
- **Log redaction:** basic token/secret redaction is incomplete. Use **synthetic or sanitized** test data; do not upload confidential production logs.
- **Incident ranking and historical matching are heuristics:** similarity scores are not probabilities of a shared root cause or of a successful fix.
- **Performance:** sample runs with repetitive log lines are not proof of throughput on diverse or adversarial real-world logs. Benchmark on representative inputs before making latency claims.
- **Security hardening needed for any future public backend:** real authentication, authorization, per-user data access, input validation, quotas/rate limiting, and secret rotation.

## Roadmap

- [ ] Implement genuine Firebase Authentication and server-enforced data access rules if shared cloud storage is introduced.
- [ ] Expand representative test cases and reproducible performance benchmarks.
- [ ] Improve service extraction, log format detection and incident-grouping evaluation.
- [ ] Add a deployment option for ML inference when resources are available.
- [ ] Support explicit import/export of local incident history.

## Contributing

Suggestions and fixes are welcome through GitHub issues and pull requests. Please avoid adding credentials, private log files, large generated archives, or production data to the repository.

---

**Built for a hackathon:** helping engineers find the signal in noisy logs while keeping evidence, limitations, and possible causes clearly distinguished.
