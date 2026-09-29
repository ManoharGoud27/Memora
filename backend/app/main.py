"""FastAPI application entry point."""
from datetime import UTC, datetime
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.api.routes.clients import router as clients_router
from app.api.routes.projects import router as projects_router
from app.api.routes.memories import router as memories_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.payments import router as payments_router
from app.api.routes.auth import router as auth_router

app = FastAPI(title="Freelancer Memory Agent API", version="0.1.0")
logger = logging.getLogger(__name__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(clients_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(memories_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")



def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if origin in [settings.frontend_url, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {"Access-Control-Allow-Origin": "*"}


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "REQUEST_ERROR", "message": str(exc.detail), "details": {}}
    headers = {**_cors_headers(request), **(exc.headers or {})}
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": detail, "timestamp": datetime.now(UTC).isoformat()}, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "The request did not pass validation", "details": jsonable_encoder(exc.errors())}, "timestamp": datetime.now(UTC).isoformat()}, headers=_cors_headers(request))


@app.exception_handler(Exception)
async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled request error", exc_info=exc)
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": f"Server error: {exc}", "details": {}}, "timestamp": datetime.now(UTC).isoformat()}, headers=_cors_headers(request))


@app.get("/health")
def health() -> dict[str, object]:
    """Return basic service liveness in the standard response envelope."""
    return {"success": True, "data": {"status": "ok"}, "message": "Service is healthy", "timestamp": datetime.now(UTC).isoformat()}
