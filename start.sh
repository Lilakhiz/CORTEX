#!/bin/bash
# CORTEX Full Stack Startup Script
# Starts both the Python backend (FastAPI) and React frontend (Vite)

set -e

echo "========================================"
echo "  CORTEX Full Stack Startup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Paths
CORTEX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$CORTEX_DIR/ai_search_engine_2"
FRONTEND_DIR="$CORTEX_DIR/cortex-main"

# Check backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ Backend .env not found. Copying from .env.example...${NC}"
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "${RED}Please edit $BACKEND_DIR/.env with your API keys before continuing.${NC}"
    echo "Required: GROQ_API_KEY, TAVILY_API_KEY, NEWS_API_KEY"
    exit 1
fi

# Check frontend .env.local
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${YELLOW}⚠ Frontend .env.local not found. Copying from .env.example...${NC}"
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"
    echo -e "${RED}Please edit $FRONTEND_DIR/.env.local with your Convex credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment files found${NC}"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start backend
echo "Starting Python backend (FastAPI on port 8000)..."
cd "$BACKEND_DIR"

# Check if uv is available, otherwise use pip
if command -v uv &> /dev/null; then
    echo "Using uv for dependency management..."
    uv sync
    BACKEND_CMD="uv run uvicorn api:app --host 0.0.0.0 --port 8000"
else
    echo "Using pip/venv for dependency management..."
    if [ ! -d ".venv" ]; then
        python -m venv .venv
    fi
    source .venv/bin/activate
    pip install -r <(uv export --format requirements-txt 2>/dev/null || cat pyproject.toml | grep -A 20 'dependencies =' | grep -E '^\s+"' | sed 's/[",]//g' | sed 's/^\s*//')
    BACKEND_CMD="uvicorn api:app --host 0.0.0.0 --port 8000"
fi

# Start backend in background
$BACKEND_CMD &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready at http://localhost:8000${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

echo ""

# Start frontend
echo "Starting React frontend (Vite on port 3000)..."
cd "$FRONTEND_DIR"

if command -v bun &> /dev/null; then
    echo "Using bun..."
    FRONTEND_CMD="bun run dev"
elif command -v npm &> /dev/null; then
    echo "Using npm..."
    FRONTEND_CMD="npm run dev"
else
    echo -e "${RED}Neither bun nor npm found. Please install one.${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend in background
$FRONTEND_CMD &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================"
echo -e "${GREEN}  CORTEX is running!${NC}"
echo "========================================"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID