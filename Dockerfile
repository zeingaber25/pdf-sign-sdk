# PDF Sign SDK - Docker Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY pdf-sign-sdk.js .
COPY example.html .
COPY dummy.pdf .
COPY server.js .
COPY package.json .
COPY README.md .

# Expose port
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/example.html', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the server
CMD ["node", "server.js"]
