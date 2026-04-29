"""GPU Worker — FastAPI 入口"""
from fastapi import FastAPI
from api.routes import router
from heartbeat.reporter import HeartbeatReporter
from utils.network import register_node
import uvicorn
import asyncio
import config

app = FastAPI(title="AI GPU Worker", version="1.0.0")
app.include_router(router, prefix="/api/v1")

heartbeat_reporter = HeartbeatReporter()


@app.on_event("startup")
async def startup():
    register_node()
    asyncio.create_task(heartbeat_reporter.start())


@app.on_event("shutdown")
async def shutdown():
    await heartbeat_reporter.stop()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.API_PORT, reload=False)
