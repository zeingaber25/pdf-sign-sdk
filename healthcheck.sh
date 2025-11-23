#!/bin/sh
# Simple health check script for Docker container
# Checks if the server is responding on port 8000

PORT=${PORT:-8000}
URL="http://localhost:${PORT}/example.html"

# Use wget if available, otherwise fallback to built-in node
if command -v wget >/dev/null 2>&1; then
    wget --spider --quiet --timeout=2 "$URL" 2>/dev/null
    exit $?
else
    # Fallback to node
    node -e "require('http').get('$URL', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
fi
