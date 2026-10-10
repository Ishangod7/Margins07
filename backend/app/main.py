from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import ALLOWED_ORIGINS
from .routers import auth_routes, me, notices

app = FastAPI(title="Margins API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_routes.router)
app.include_router(me.router)
app.include_router(notices.router)


@app.get("/health")
def health():
    return {"ok": True}
