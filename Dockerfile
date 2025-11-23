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
COPY healthcheck.sh .

# Make health check script executable
RUN chmod +x healthcheck.sh

# Expose port
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ./healthcheck.sh

# Run the server
CMD ["node", "server.js"]
