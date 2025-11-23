# PDF Sign SDK (Web Component)

A powerful, zero-dependency PDF signature annotation SDK built as a Web Component. Add, position, and export digital signatures with support for click-based positioning, rectangle selection, and handwritten signatures. Works in any framework or vanilla JavaScript.

## Features

### **Signature Modes**
- ✎ **Click Mode**: Single-point signature positioning
- ▭ **Rectangle Mode**: Drag to select rectangular areas for signature placement
- 🖊 **Handwriting Mode**: Draw signatures directly on canvas at selected positions

### **Core Features**
- 📄 **Multi-page PDF support** with pdf.js integration
- 🎨 **Three signature types**: point markers, rectangles, handwritten images
- 💾 **Auto-persistence** to localStorage (opt-in via `enablePersistence(true)`)
- 🔍 **Text search** with exact bounding-box highlighting
- 📐 **Zoom & navigation**: zoom in/out, fit-to-width, page navigation
- 🖼️ **Thumbnails strip** for quick page navigation
- 📥 **Export annotated PDFs** with signatures embedded
- 🖨️ **Print support** with annotations
- ↶ **Undo/Redo** for signature placement
- 📊 **Percentage-based coordinates** (responsive across devices)
- 🎯 **Draggable markers** for repositioning
- 🗑️ **Delete individual signatures** with inline controls

### **Embedded Toolbar**
- Integrated toolbar with all controls (no external UI needed)
- Zoom bar with click-to-set
- Find/search functionality
- Export, preview, print, undo, and clear buttons
- Responsive design

### **Developer Features**
- ✅ Zero external dependencies (loads pdf.js + pdf-lib dynamically)
- 🔌 Web Component standard (works in any framework)
- 📡 Custom events: `position-added`, `position-removed`, `position-updated`, `loaded`, `zoom-changed`
- 🎛️ Comprehensive JavaScript API
- 💡 Easy integration with React, Angular, Vue, Svelte, etc.

## Files

- `pdf-sign-sdk.js` – Main SDK (Web Component + utilities)
- `example.html` – Plain HTML + JS demo
- `README.md` – Documentation
- `server.js` – Node.js HTTP server (cross-platform)
- `serve.sh` – Linux/Unix development server script
- `package.json` – NPM package configuration

## Quick Start

### 1. **Include in HTML**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PDF Signature Viewer</title>
</head>
<body>
  <!-- Load the SDK -->
  <script src="./pdf-sign-sdk.js"></script>

  <!-- Use the component -->
  <pdf-sign-viewer id="viewer" src="/path/to/document.pdf" height="600px"></pdf-sign-viewer>

  <script>
    const viewer = document.getElementById('viewer');
    
    // Listen for signature additions
    viewer.addEventListener('position-added', (ev) => {
      console.log('Signature added:', ev.detail);
    });

    // Listen for PDF load
    viewer.addEventListener('loaded', (ev) => {
      console.log('PDF loaded with', ev.detail.pages, 'pages');
    });
  </script>
</body>
</html>
```

### 2. **Run Locally**

#### **Linux/Unix** (Recommended)

```bash
# Method 1: Using the provided shell script (Python)
cd /path/to/pdf-sign-sdk
chmod +x serve.sh
./serve.sh
# Then open http://localhost:8000/example.html

# Method 2: Using Node.js (no dependencies)
npm start
# or
node server.js
# Then open http://localhost:8000/example.html

# Method 3: Using Python directly
python3 -m http.server 8000
```

#### **Windows**

```powershell
# Using Python
cd c:\path\to\pdf-sign-sdk
py -3 -m http.server 8000
# Then open http://localhost:8000/example.html

# Or using Node.js
node server.js
```

## API Reference

### **Component Properties**

```html
<pdf-sign-viewer 
  src="/path/to/pdf.pdf"
  height="600px"
></pdf-sign-viewer>
```

### **JavaScript API**

```javascript
const viewer = document.getElementById('viewer');

// Signature positioning
viewer.addPosition({
  page: 1,
  xPercent: 50,
  yPercent: 20,
  label: 'Signature',
  widthPercent: 20,      // Optional: for rectangles
  heightPercent: 10      // Optional: for rectangles
});

viewer.getPositions();           // Returns array of all positions
viewer.removePosition(id);       // Remove a specific signature
viewer.undoLast();              // Undo last removal
viewer.clearPositions();        // Remove all signatures

// Viewer controls
viewer.enableAddMode('click');  // 'click' | 'rect' | 'draw' | false
viewer.zoomTo(1.5);             // Set zoom level
viewer.zoomIn();                // Increase zoom
viewer.zoomOut();               // Decrease zoom
viewer.fitToWidth();            // Fit PDF to viewport width
viewer.goToPage(2);             // Navigate to page
viewer.toggleThumbnails();      // Show/hide thumbnail strip

// Search
viewer.findText('search term');  // Find text with highlighting

// Persistence
viewer.enablePersistence(true);  // Auto-save to localStorage

// Export
viewer.exportAnnotatedPdf('filename.pdf'); // Download PDF
viewer.exportAnnotatedPdf('filename.pdf', {download: false}) // Get Blob
  .then(blob => console.log('PDF Blob:', blob));

// Preview (embedded viewer)
viewer.previewAnnotatedPdf('preview.pdf');

// Print
viewer.printAnnotated();

// Events
viewer.addEventListener('position-added', (ev) => console.log(ev.detail));
viewer.addEventListener('position-removed', (ev) => console.log(ev.detail));
viewer.addEventListener('loaded', (ev) => console.log('Pages:', ev.detail.pages));
```

## Framework Integration Examples

### **React**

```jsx
import React, { useRef, useEffect } from 'react';

export default function PDFSignViewer() {
  const viewerRef = useRef(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    
    const handlePositionAdded = (ev) => {
      console.log('Signature added:', ev.detail);
    };

    viewer?.addEventListener('position-added', handlePositionAdded);
    return () => viewer?.removeEventListener('position-added', handlePositionAdded);
  }, []);

  const handleExport = () => {
    viewerRef.current?.exportAnnotatedPdf('signed.pdf');
  };

  return (
    <div>
      <script src="./pdf-sign-sdk.js"></script>
      <pdf-sign-viewer 
        ref={viewerRef}
        src="/document.pdf"
        height="600px"
      ></pdf-sign-viewer>
      <button onClick={handleExport}>Download Signed PDF</button>
    </div>
  );
}
```

### **Vue 3**

```vue
<template>
  <div>
    <pdf-sign-viewer 
      ref="viewer"
      src="/document.pdf"
      height="600px"
      @position-added="onPositionAdded"
      @loaded="onLoaded"
    ></pdf-sign-viewer>
    <button @click="exportPDF">Download Signed PDF</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const viewer = ref(null);

const onPositionAdded = (ev) => {
  console.log('Signature added:', ev.detail);
};

const onLoaded = (ev) => {
  console.log('PDF loaded:', ev.detail.pages, 'pages');
};

const exportPDF = () => {
  viewer.value?.exportAnnotatedPdf('signed.pdf');
};
</script>

<style scoped>
pdf-sign-viewer {
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>
```

### **Angular**

```typescript
import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-pdf-viewer',
  template: `
    <div>
      <pdf-sign-viewer 
        #viewer
        src="/document.pdf"
        height="600px"
        (position-added)="onPositionAdded($event)"
      ></pdf-sign-viewer>
      <button (click)="exportPDF()">Download Signed PDF</button>
    </div>
  `,
  styles: [`
    pdf-sign-viewer {
      border: 1px solid #ddd;
      border-radius: 8px;
    }
  `]
})
export class PDFViewerComponent {
  @ViewChild('viewer') viewer!: ElementRef;

  onPositionAdded(event: CustomEvent) {
    console.log('Signature added:', event.detail);
  }

  exportPDF() {
    (this.viewer.nativeElement as any).exportAnnotatedPdf('signed.pdf');
  }
}
```

### **Svelte**

```svelte
<script>
  import { onMount } from 'svelte';
  
  let viewer;

  onMount(() => {
    viewer?.addEventListener('position-added', (ev) => {
      console.log('Signature added:', ev.detail);
    });
  });

  const exportPDF = () => {
    viewer?.exportAnnotatedPdf('signed.pdf');
  };
</script>

<div>
  <script src="./pdf-sign-sdk.js"></script>
  <pdf-sign-viewer 
    bind:this={viewer}
    src="/document.pdf"
    height="600px"
  ></pdf-sign-viewer>
  <button on:click={exportPDF}>Download Signed PDF</button>
</div>

<style>
  :global(pdf-sign-viewer) {
    border: 1px solid #ddd;
    border-radius: 8px;
  }
</style>
```

### **Vanilla JavaScript (Advanced)**

```javascript
// Programmatic usage
const viewer = window.PDFSignSDK.create({
  src: '/document.pdf',
  height: '600px'
});

document.body.appendChild(viewer);

// Enable persistence
viewer.enablePersistence(true);

// Add multiple signatures programmatically
viewer.addEventListener('loaded', () => {
  viewer.addPosition({page: 1, xPercent: 30, yPercent: 80, label: 'Signature 1'});
  viewer.addPosition({page: 1, xPercent: 70, yPercent: 80, label: 'Signature 2'});
});

// Export when ready
document.getElementById('export-btn').addEventListener('click', () => {
  viewer.exportAnnotatedPdf('document-signed.pdf');
});
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+F | Open find dialog |
| Esc | Close dialogs |
| +/- | Zoom in/out |
| Enter | Confirm selections |

## LocalStorage

When persistence is enabled, signatures are stored under the key: `pdfsign:<encoded-url>`

To clear stored signatures:
```javascript
localStorage.removeItem('pdfsign:encoded-url');
localStorage.clear(); // Clear all
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- (Requires Web Component and Shadow DOM support)

## Performance

- **Lazy rendering**: Pages render on-demand (intersection observer)
- **CDN fallback**: pdf.js loads from multiple CDNs automatically
- **Efficient caching**: Reuses page references and rendering context
- **Minimal bundle**: Single 50KB script (gzipped)

## Customization

### Custom CSS

```javascript
const viewer = document.getElementById('viewer');

viewer.setCustomCSS(`
  .psdk-btn:hover {
    background: #f0f0f0;
  }
`);

// Or load from URL
viewer.loadCustomCSS('/path/to/custom-styles.css');
```

### Themes

```javascript
viewer.applyTheme('pdftron'); // Apply PDFTron-like theme
```

## Events

```javascript
viewer.addEventListener('position-added', (ev) => {
  // ev.detail = {id, page, xPercent, yPercent, label, ...}
});

viewer.addEventListener('position-removed', (ev) => {
  // ev.detail = removed position
});

viewer.addEventListener('position-updated', (ev) => {
  // ev.detail = updated position (after drag)
});

viewer.addEventListener('zoom-changed', (ev) => {
  // ev.detail = {scale}
});

viewer.addEventListener('find-result', (ev) => {
  // ev.detail = {page, query}
});

viewer.addEventListener('loaded', (ev) => {
  // ev.detail = {pages: number}
});
```

## Deployment on Linux

### **NPM Publishing**

To publish this package to NPM:

```bash
# Login to NPM
npm login

# Publish the package
npm publish
```

Users can then install it via:

```bash
npm install pdf-sign-sdk
```

### **Production Deployment with systemd**

For production Linux servers, use systemd to run the service:

1. **Install the application:**

```bash
# Clone or copy files to /var/www/pdf-sign-sdk
sudo mkdir -p /var/www/pdf-sign-sdk
sudo cp -r * /var/www/pdf-sign-sdk/
sudo chown -R www-data:www-data /var/www/pdf-sign-sdk
```

2. **Install Node.js** (if not already installed):

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

3. **Setup systemd service:**

```bash
# Copy service file
sudo cp pdf-sign-sdk.service /etc/systemd/system/

# Edit the service file if needed (change user, path, port)
sudo nano /etc/systemd/system/pdf-sign-sdk.service

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable pdf-sign-sdk

# Start the service
sudo systemctl start pdf-sign-sdk

# Check status
sudo systemctl status pdf-sign-sdk
```

4. **View logs:**

```bash
# Real-time logs
sudo journalctl -u pdf-sign-sdk -f

# Last 100 lines
sudo journalctl -u pdf-sign-sdk -n 100
```

### **Nginx Reverse Proxy** (Optional)

For production with SSL/TLS:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Docker Deployment** (Alternative)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t pdf-sign-sdk .
docker run -d -p 8000:8000 pdf-sign-sdk
```

## License

MIT – Feel free to use, modify, and distribute.

## Contributing

Contributions welcome! Feel free to submit issues and pull requests.
