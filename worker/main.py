"""GPU Worker — FastAPI 入口"""
from fastapi import FastAPI
from api.routes import router
import asyncio
import logging
import uvicorn
import config

logger = logging.getLogger(__name__)

app = FastAPI(title="AI GPU Worker", version="2.0.0")
app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def _start_cleanup_scheduler():
    from engine.cleanup import cleanup_old_outputs

    async def _loop():
        while True:
            try:
                await cleanup_old_outputs()
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
            await asyncio.sleep(3600)

    asyncio.create_task(_loop())


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.API_PORT, reload=False)
