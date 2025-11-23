# PDF Sign SDK - Quick Reference Card

## 🚀 Quick Start (Linux)

### Option 1: Instant Start with Bash Script
```bash
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk
chmod +x serve.sh
./serve.sh
# Open: http://localhost:8000/example.html
```

### Option 2: Node.js (Recommended)
```bash
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk
npm start
# Open: http://localhost:8000/example.html
```

### Option 3: Docker (Isolated)
```bash
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk
docker-compose up -d
# Open: http://localhost:8000/example.html
```

## 📦 NPM Publishing

```bash
npm login
npm publish
```

Users install with: `npm install pdf-sign-sdk`

## 🏭 Production Deployment

### Ubuntu/Debian
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Deploy application
sudo mkdir -p /var/www/pdf-sign-sdk
cd /var/www/pdf-sign-sdk
sudo git clone https://github.com/zeingaber25/pdf-sign-sdk.git .
sudo chown -R www-data:www-data /var/www/pdf-sign-sdk

# Setup systemd service
sudo cp pdf-sign-sdk.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pdf-sign-sdk
sudo systemctl start pdf-sign-sdk

# Check status
sudo systemctl status pdf-sign-sdk
```

### CentOS/RHEL
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Deploy (same as Ubuntu above)
```

## 🔧 Service Management

```bash
# Start service
sudo systemctl start pdf-sign-sdk

# Stop service
sudo systemctl stop pdf-sign-sdk

# Restart service
sudo systemctl restart pdf-sign-sdk

# View logs
sudo journalctl -u pdf-sign-sdk -f

# Check status
sudo systemctl status pdf-sign-sdk
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t pdf-sign-sdk .

# Run container
docker run -d -p 8000:8000 pdf-sign-sdk

# With docker-compose
docker-compose up -d        # Start
docker-compose down         # Stop
docker-compose logs -f      # View logs
docker-compose restart      # Restart
```

## 🔐 Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/pdf-sign-sdk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Testing

Run the comprehensive test suite:
```bash
./test-deployment.sh
```

Tests include:
- Node.js server functionality
- npm start command
- Docker deployment
- File serving
- Security (directory traversal protection)

## 🔒 Security

✅ Directory traversal protection enabled
✅ CodeQL security scan: 0 vulnerabilities
✅ Path validation ensures files stay within app directory

## 📊 Port Configuration

Change the default port (8000):

```bash
# Node.js
PORT=3000 node server.js

# npm
PORT=3000 npm start

# Bash script
PORT=3000 ./serve.sh

# Docker
docker run -d -p 3000:8000 -e PORT=8000 pdf-sign-sdk

# systemd (edit /etc/systemd/system/pdf-sign-sdk.service)
Environment=PORT=3000
```

## 📁 File Structure

```
pdf-sign-sdk/
├── pdf-sign-sdk.js           # Main SDK
├── example.html              # Demo page
├── dummy.pdf                 # Sample PDF
├── server.js                 # Node.js server
├── serve.sh                  # Bash startup script
├── healthcheck.sh            # Docker health check
├── package.json              # NPM config
├── Dockerfile                # Docker image
├── docker-compose.yml        # Docker orchestration
├── pdf-sign-sdk.service      # systemd service
├── test-deployment.sh        # Test suite
├── README.md                 # Full documentation
└── LINUX_DEPLOYMENT.md       # Deployment guide
```

## 🆘 Troubleshooting

### Port in use
```bash
# Find process
sudo lsof -i :8000

# Kill process
sudo kill -9 PID

# Or use different port
PORT=9000 npm start
```

### Permission denied
```bash
chmod +x serve.sh
sudo chown -R www-data:www-data /var/www/pdf-sign-sdk
```

### Docker not starting
```bash
sudo systemctl start docker
docker ps -a  # Check container status
docker logs CONTAINER_ID  # View logs
```

## 📚 Documentation

- **Full Documentation**: README.md
- **Deployment Guide**: LINUX_DEPLOYMENT.md
- **GitHub**: https://github.com/zeingaber25/pdf-sign-sdk

## ✅ Tested & Verified

✅ All deployment methods tested
✅ Security scans passed
✅ 8/8 tests passing
✅ Production ready
