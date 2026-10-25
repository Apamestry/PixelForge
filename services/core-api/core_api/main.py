import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core_api.config import settings
from core_api.database import init_db
from core_api.logger import logger, request_id_ctx
from core_api.routes import auth, templates, projects, assets, exports, files, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting PixelForge Core API...")
    init_db()
    yield
    # Shutdown
    logger.info("Stopping PixelForge Core API...")

app = FastAPI(
    title="PixelForge Core API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    token = request_id_ctx.set(req_id)
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration}ms)")
        response.headers["X-Request-Id"] = req_id
        return response
    finally:
        request_id_ctx.reset(token)

# Healthz per SPEC Section 5 & 8
@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# Mount API routes
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(templates.router)
api_router.include_router(projects.router)
api_router.include_router(assets.router)
api_router.include_router(exports.router)
api_router.include_router(files.router)
api_router.include_router(admin.router)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("core_api.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
