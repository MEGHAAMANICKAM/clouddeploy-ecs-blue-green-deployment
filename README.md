# CloudDeploy

CloudDeploy is a premium DevOps deployment monitoring dashboard for demonstrating blue-green deployment workflows. Phase 1 uses clearly labelled simulated data and controls; it does not execute AWS operations.

## Run locally with Docker Compose

```bash
copy .env.example .env
docker compose up --build
```

Open the dashboard at `http://localhost:3000`. The Flask API is available at `http://localhost:8080`.

To demonstrate a different application version:

```bash
APP_VERSION=2.0.0 docker compose up --build
```

The frontend reads its API base URL from `VITE_API_BASE_URL`. Use `/api` for Docker Compose (the Nginx container proxies it to the backend), or `http://localhost:8080/api` when running the frontend with Vite and the Flask server locally.

## Run without Docker

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` to the backend on port 8080.

## API

- `GET /health` - load balancer health check
- `GET /api/health` - application health
- `GET /api/version` - environment-driven application version
- `GET /api/deployment` - current simulated deployment
- `GET /api/environments` - blue and green environment state
- `GET /api/deployments/history` - sample deployment history

All deployment and monitoring data is simulated until a future AWS integration phase. AWS credentials must remain server-side when real integrations are added.
