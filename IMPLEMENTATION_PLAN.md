# Phase 1, Step 1 Implementation Plan

## Scope
Build the initial project and backend foundation for the Freelancer Memory Agent. Stop after database connectivity and migration verification; do not begin client CRUD or frontend work.

## Work sequence
1. Create the requested top-level folders and Python package structure for the backend, including API, core, DB, models, schemas, services, Alembic, and tests.
2. Add Docker Compose with PostgreSQL 16 and the pgvector extension image, persistent storage, health check, and environment-based credentials.
3. Add FastAPI configuration, SQLAlchemy 2.0 declarative base/session, and application entry point with CORS configured from environment.
4. Define UUID-backed SQLAlchemy models for clients, projects, memories, conversations, and payments, including foreign keys, indexes, JSONB, timezone-aware timestamps, and a 1536-dimensional vector column.
5. Configure Alembic and create the initial migration for the requested schema, including enabling the vector extension and creating its indexes.
6. Add backend requirements, Dockerfile, `.env.example`, `.gitignore`, and the requested root `AGENTS.md` rules.
7. Attempt to start the database and run the migration. Report whether this succeeds in the current environment; do not proceed to Step 2.

## Decisions / boundaries
- Preserve the supplied schema and defaults, using SQLAlchemy/Python equivalents.
- Keep secrets in environment variables and commit no real credentials.
- Use a declarative Alembic migration so schema setup is reproducible.
- The requested project name is `freelancer-memory-agent`; this repository root is already the working directory, so files will be created here rather than in an extra nested directory.
- No tests or frontend implementation are included in this step.
