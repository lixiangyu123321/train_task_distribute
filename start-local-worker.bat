@echo off
set SCHEDULER_URL=http://124.221.85.5:8080
set WORKER_NAME=local-gpu-worker
set GPU_API_PORT=9000

echo ============================================
echo   AI GPU Worker - Local Temp Node
echo ============================================
echo Scheduler:  %SCHEDULER_URL%
echo Worker:     %WORKER_NAME%
echo Port:       %GPU_API_PORT%
echo ============================================

cd /d "%~dp0worker"
python main.py
pause
