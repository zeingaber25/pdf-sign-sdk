#!/usr/bin/env node

/**
 * Simple HTTP server for PDF Sign SDK
 * No dependencies required - uses Node.js built-in http module
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL and remove query strings
  let filePath = req.url.split('?')[0];
  
  // Default to example.html for root
  if (filePath === '/') {
    filePath = '/example.html';
  }
  
  // Security: prevent directory traversal
  // Normalize the path and ensure it stays within the application directory
  const requestedPath = path.normalize(filePath.replace(/^\//, ''));
  const fullPath = path.resolve(__dirname, requestedPath);
  
  // Verify the resolved path is within the application directory
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 - Forbidden');
    return;
  }
  
  // Get file extension for MIME type
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  // Read and serve the file
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Internal Server Error');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 PDF Sign SDK Server Running');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📍 Local:   http://localhost:${PORT}/example.html`);
  console.log(`🌐 Network: http://${HOST}:${PORT}/example.html`);
  console.log('═══════════════════════════════════════════════════');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
