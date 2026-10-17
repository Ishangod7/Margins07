from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from .config import ALLOWED_ORIGINS
from .routers import auth_routes, me, notices, resources, doubts

app = FastAPI(title="Margins API")

# Gzip compression for all JSON payloads over 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# High-performance CORS with 24-hour preflight caching
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)
app.include_router(auth_routes.router)
app.include_router(me.router)
app.include_router(notices.router)
app.include_router(resources.router)
app.include_router(doubts.router)
app.include_router(doubts.answers_router)


@app.get("/health")
def health():
    return {"ok": True}
