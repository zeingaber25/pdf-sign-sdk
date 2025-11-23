# Quick Start Guide - Running PDF Sign SDK on Linux

This guide provides step-by-step instructions for running the PDF Sign SDK on Linux systems.

## Prerequisites

Choose one of the following:
- **Python 3** (simplest option)
- **Node.js 14+** (recommended for production)
- **Docker** (for containerized deployment)

## Method 1: Quick Start with Bash Script (Python)

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk

# Make the script executable
chmod +x serve.sh

# Run the server
./serve.sh
```

Then open your browser to: http://localhost:8000/example.html

## Method 2: Using Node.js (Recommended)

For better performance and control:

```bash
# Clone the repository
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk

# Start the server (no npm install needed - zero dependencies!)
npm start

# Or directly with node
node server.js
```

Then open your browser to: http://localhost:8000/example.html

### Custom Port

```bash
PORT=3000 npm start
# or
PORT=3000 node server.js
```

## Method 3: Using Docker

For isolated, containerized deployment:

```bash
# Clone the repository
git clone https://github.com/zeingaber25/pdf-sign-sdk.git
cd pdf-sign-sdk

# Build and run with Docker
docker build -t pdf-sign-sdk .
docker run -d -p 8000:8000 --name pdf-sign-sdk pdf-sign-sdk

# Or use Docker Compose (easier)
docker-compose up -d
```

Then open your browser to: http://localhost:8000/example.html

### Docker Commands

```bash
# View logs
docker logs -f pdf-sign-sdk

# Stop the container
docker stop pdf-sign-sdk

# Restart the container
docker restart pdf-sign-sdk

# Remove the container
docker rm pdf-sign-sdk
```

## Method 4: Production Deployment with systemd

For production Linux servers:

### 1. Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL/Fedora:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. Deploy the Application

```bash
# Create application directory
sudo mkdir -p /var/www/pdf-sign-sdk

# Clone or copy files
cd /var/www/pdf-sign-sdk
sudo git clone https://github.com/zeingaber25/pdf-sign-sdk.git .

# Set ownership
sudo chown -R www-data:www-data /var/www/pdf-sign-sdk
```

### 3. Setup systemd Service

```bash
# Copy service file
sudo cp pdf-sign-sdk.service /etc/systemd/system/

# Edit if needed (change port, user, etc.)
sudo nano /etc/systemd/system/pdf-sign-sdk.service

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable pdf-sign-sdk

# Start the service
sudo systemctl start pdf-sign-sdk

# Check status
sudo systemctl status pdf-sign-sdk
```

### 4. Manage the Service

```bash
# View real-time logs
sudo journalctl -u pdf-sign-sdk -f

# View last 100 lines
sudo journalctl -u pdf-sign-sdk -n 100

# Restart service
sudo systemctl restart pdf-sign-sdk

# Stop service
sudo systemctl stop pdf-sign-sdk
```

## Method 5: Production with Nginx Reverse Proxy

For production with SSL/TLS support:

### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/pdf-sign-sdk`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable and Test

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pdf-sign-sdk /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Add SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Verifying Installation

After starting the server with any method, verify it's working:

```bash
# Check if server is running
curl -I http://localhost:8000/example.html

# Should return: HTTP/1.1 200 OK
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 8000
sudo lsof -i :8000

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID

# Or use a different port
PORT=9000 npm start
```

### Permission Denied

```bash
# Make sure the serve.sh script is executable
chmod +x serve.sh

# If running as systemd service, check file permissions
sudo chown -R www-data:www-data /var/www/pdf-sign-sdk
```

### Node.js Not Found

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Docker Issues

```bash
# Check if Docker is running
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

## Next Steps

1. **Open the demo**: http://localhost:8000/example.html
2. **Test the features**: Try adding signatures, drawing, exporting PDFs
3. **Integrate into your app**: See README.md for API documentation
4. **Deploy to production**: Use the systemd + Nginx setup for production

## Support

- **Repository**: https://github.com/zeingaber25/pdf-sign-sdk
- **Issues**: https://github.com/zeingaber25/pdf-sign-sdk/issues
- **Documentation**: See README.md in the repository
