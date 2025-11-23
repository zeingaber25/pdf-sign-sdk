#!/bin/bash

# PDF Sign SDK - Linux/Unix Development Server
# Simple HTTP server using Python 3

PORT=${PORT:-8000}

echo "═══════════════════════════════════════════════════"
echo "🚀 PDF Sign SDK Development Server"
echo "═══════════════════════════════════════════════════"
echo "📍 Starting server on port $PORT..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    echo "📂 Open: http://localhost:$PORT/example.html"
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Using Python..."
    echo "📂 Open: http://localhost:$PORT/example.html"
    echo ""
    python -m http.server $PORT
else
    echo "❌ Error: Python is not installed"
    echo "Please install Python 3 or Node.js to run the server"
    echo ""
    echo "Alternative: If Node.js is installed, run:"
    echo "  node server.js"
    exit 1
fi
