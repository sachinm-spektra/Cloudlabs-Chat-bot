from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .core.database import engine, Base
from .api.routes import auth, chat, files, admin, tickets

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Add new enum values before table creation (safe no-op if already exists)
    async with engine.begin() as conn:
        from sqlalchemy import text
        for val in ("l2_escalated", "owner_escalated"):
            try:
                await conn.execute(text(f"ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS '{val}'"))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="CloudLabs AI Assistant API",
    description="Azure RAG Chatbot backend for CloudLabs AI-powered lab support",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "CloudLabs AI Assistant API"}
