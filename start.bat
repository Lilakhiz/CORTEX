@echo off
REM CORTEX Full Stack Startup Script for Windows
REM Starts both the Python backend (FastAPI) and React frontend (Vite)

echo ========================================
echo   CORTEX Full Stack Startup (Windows)
echo ========================================
echo.

set CORTEX_DIR=%~dp0
set BACKEND_DIR=%CORTEX_DIR%ai_search_engine_2
set FRONTEND_DIR=%CORTEX_DIR%cortex-main

REM Check backend .env
if not exist "%BACKEND_DIR%\.env" (
    echo [WARN] Backend .env not found. Copying from .env.example...
    copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    echo [ERROR] Please edit %BACKEND_DIR%\.env with your API keys before continuing.
    echo Required: GROQ_API_KEY, TAVILY_API_KEY, NEWS_API_KEY
    pause
    exit /b 1
)

REM Check frontend .env.local
if not exist "%FRONTEND_DIR%\.env.local" (
    echo [WARN] Frontend .env.local not found. Copying from .env.example...
    copy "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env.local" >nul
    echo [ERROR] Please edit %FRONTEND_DIR%\.env.local with your Convex credentials.
    pause
    exit /b 1
)

echo [OK] Environment files found
echo.

REM Start backend
echo Starting Python backend (FastAPI on port 8000)...
cd /d "%BACKEND_DIR%"

REM Check if uv is available
where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo Using uv for dependency management...
    uv sync
    set BACKEND_CMD=uv run uvicorn api:app --host 0.0.0.0 --port 8000
) else (
    echo Using pip/venv for dependency management...
    if not exist ".venv" (
        python -m venv .venv
    )
    call .venv\Scripts\activate.bat
    REM Try to install from pyproject.toml
    pip install fastapi uvicorn langchain langchain-groq langgraph python-dotenv requests urllib3 wikipedia-api >nul 2>&1
    set BACKEND_CMD=uvicorn api:app --host 0.0.0.0 --port 8000
)

REM Start backend in background using start command
start "CORTEX Backend" cmd /k "%BACKEND_CMD%"
echo Backend started in new window.

REM Wait for backend to be ready
echo Waiting for backend to start...
for /l %%i in (1,1,30) do (
    curl -s http://localhost:8000/ >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Backend ready at http://localhost:8000
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)
echo [ERROR] Backend failed to start
pause
exit /b 1

:backend_ready
echo.

REM Start frontend
echo Starting React frontend (Vite on port 3000)...
cd /d "%FRONTEND_DIR%"

where bun >nul 2>&1
if %errorlevel% equ 0 (
    echo Using bun...
    set FRONTEND_CMD=bun run dev
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        echo Using npm...
        set FRONTEND_CMD=npm run dev
    ) else (
        echo [ERROR] Neither bun nor npm found. Please install one.
        pause
        exit /b 1
    )
)

REM Start frontend in background
start "CORTEX Frontend" cmd /k "%FRONTEND_CMD%"
echo Frontend started in new window.

echo.
echo ========================================
echo   CORTEX is running!
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Close the backend and frontend windows to stop the servers.
echo Press any key to exit this launcher window...
pause >nul