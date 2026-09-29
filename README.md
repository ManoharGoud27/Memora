# Memo — Freelancer Memory Agent

A memory-first workspace for freelance client relationships. It includes a responsive dashboard, client profiles, project tracking, a memory timeline, an AI assistant, payment tracking, and a FastAPI API backed by PostgreSQL 16 with pgvector.

## Run with Docker Compose

Requirements: Docker Desktop with Compose.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The API health check is at <http://localhost:8000/health> and interactive API docs are at <http://localhost:8000/docs>. The API container applies the Alembic migration before starting.

## Run the frontend locally

Requirements: Node.js 20 or later and npm.

```powershell
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:8000/api/v1` by default. Set `VITE_API_URL` to change it.

## Run the backend locally

Requirements: Python 3.11, Docker Compose, and a running PostgreSQL/pgvector database.

```powershell
Copy-Item .env.example .env
docker compose up -d db
cd backend
Copy-Item .env.example .env
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The database migration creates clients, projects, memories, conversations, and payments, enables pgvector, and adds the schema indexes. `DATABASE_URL` may be set in `backend/.env` for a custom database connection.

## Included workflows

- Dashboard with client overview and recent clients
- Client list with search, create, delete, loading, and error states
- Client profile page
- Project management with progress tracking
- Memory timeline with confidence indicators, editing, deletion, and explainability
- Conversation history and memory-grounded AI chat
- Payment schedule with status updates
- FastAPI CRUD/search endpoints for clients, projects, memories, conversations, and payments
- SQLAlchemy 2.0 models and initial Alembic migration for the requested relational/vector schema
- Docker Compose services for PostgreSQL, API, and frontend

AI chat and extraction require `LLM_API_KEY`. Set `LLM_MODEL` to a Claude model or an OpenAI chat model. Semantic embeddings use `EMBEDDING_API_KEY` and the configured 1536-dimensional embedding model. Without an embedding key, chat can still use recent saved memories as context, but vector similarity search is unavailable.
