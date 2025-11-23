// PDF Sign SDK - Web Component (uses pdf.js + pdf-lib when available)
// This version renders PDFs into canvases (no iframe), supports multi-page,
// percentage-based signature positions, and can export an annotated PDF using pdf-lib.

(function(){
  const PDFJS_CANDIDATES = [
    'https://unpkg.com/pdfjs-dist/build/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
  ];
  const PDF_LIB_URL = 'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js';
  const PDFTRON_CSS = `
/* PDFTron-like theme (basic approximation) */
:host{background:#0f1720}
.viewer{background:linear-gradient(180deg,#0b1220,#111827);padding:18px}
.page{background:#0f1722;border-radius:6px;box-shadow:0 8px 30px rgba(2,6,23,0.6)}
.marker{background:linear-gradient(180deg,#1ea7ff,#0086d1);border:2px solid rgba(255,255,255,0.06);box-shadow:0 8px 18px rgba(0,120,200,0.14)}
.label-editor{background:#0b1220;border:1px solid rgba(255,255,255,0.04);color:#e6f2ff}
`.trim();

  function loadScript(url){
    return new Promise((resolve, reject) => {
      if(document.querySelector(`script[src="${url}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.onload = ()=> resolve();
      s.onerror = (e)=> reject(new Error('Failed to load '+url));
      document.head.appendChild(s);
    });
  }

  async function loadScriptCandidates(urls){
    let lastErr = null;
    for(const url of urls){
      try{
        await loadScript(url);
        return url;
      }catch(e){
        lastErr = e;
      }
    }
    throw lastErr || new Error('No candidate URLs succeeded');
  }

  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host{display:block;position:relative;width:100%;height:600px;font-family:Arial,Helvetica,sans-serif}
      .viewer{width:100%;height:100%;overflow:auto;border:1px solid #ddd;background:linear-gradient(180deg,#fafafa,#f2f6f9);padding:12px;box-sizing:border-box}
      .page{position:relative;margin:12px auto;background:#fff;border-radius:6px;box-shadow:0 6px 18px rgba(20,30,40,0.06);overflow:hidden}
      canvas{display:block}
      .overlay{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
      .overlay.capture{pointer-events:auto;cursor:crosshair}
      .overlay.draw-mode{cursor:crosshair}
      .selection-box{position:absolute;border:2px dashed #0078d4;background:rgba(0,120,212,0.08);pointer-events:none}
      .handwrite-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,0.3);z-index:9999;padding:20px;max-width:600px;width:90%}
      .handwrite-canvas{border:2px solid #ddd;border-radius:8px;background:#fff;cursor:crosshair;width:100%;height:300px;display:block;margin:12px 0}
      .handwrite-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
      .handwrite-btns button{padding:8px 16px;border-radius:6px;border:1px solid #dbe6f2;background:#f0f8ff;color:#0078d4;cursor:pointer;font-weight:600}
      .handwrite-btns button.primary{background:#0078d4;color:#fff;border:none}
      .handwrite-btns button:hover{background:rgba(0,120,212,0.1)}
      .marker{position:absolute;min-width:22px;min-height:22px;padding:2px 6px;border-radius:18px;background:linear-gradient(180deg,#ff6b6b,#ff3b3b);border:2px solid rgba(255,255,255,0.9);box-shadow:0 6px 14px rgba(0,0,0,0.12);transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;user-select:none;cursor:pointer}
      .marker:hover{transform:translate(-50%,-50%) scale(1.06)}
      .marker.dragging{opacity:0.85;box-shadow:0 10px 24px rgba(0,0,0,0.18)}
      .marker small{font-size:10px;opacity:0.9;margin-left:6px}
      .preview{position:absolute;pointer-events:none;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:13px;background:rgba(0,150,255,0.9);box-shadow:0 6px 18px rgba(0,120,220,0.18);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
      .label-editor{position:absolute;background:#fff;border:1px solid #e6eef8;border-radius:6px;padding:6px;box-shadow:0 8px 20px rgba(20,40,60,0.08);display:flex;gap:6px;align-items:center}
      .label-editor input{border:1px solid #dceffd;padding:6px;border-radius:4px;width:80px}
      .label-editor button{background:#0078d4;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer}
      .label-editor button.secondary{background:#e6f0fb;color:#0078d4}
      .marker.enter{animation:marker-enter .32s cubic-bezier(.2,.9,.2,1)}
      .marker .del{position:absolute;right:-8px;top:-8px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;border:none;font-size:12px;display:none;align-items:center;justify-content:center;cursor:pointer}
      .marker:hover .del{display:flex}
      @keyframes marker-enter{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}60%{transform:translate(-50%,-50%) scale(1.08);opacity:1}100%{transform:translate(-50%,-50%) scale(1)}
      /* Ribbon-like toolbar styles */
      /* Top-centered compact ribbon (overlay) */
      .psdk-toolbar{position:absolute;left:50%;transform:translateX(-50%);top:10px;display:flex;gap:8px;padding:6px 10px;background:transparent;border-radius:6px;align-items:center;font-family:Segoe UI,SegoeUI,Roboto,Helvetica,Arial,sans-serif;z-index:1200}
      .psdk-iconbar{display:flex;gap:6px;padding:6px;background:rgba(255,255,255,0.9);border-radius:8px;box-shadow:0 8px 30px rgba(2,6,23,0.06);backdrop-filter:blur(4px)}
      .psdk-zoombar{position:absolute;left:20px;right:20px;top:56px;height:36px;background:linear-gradient(180deg,#f3f6f9,#ffffff);border-radius:6px;padding:6px 12px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(2,6,23,0.04);z-index:1100}
      .psdk-zoom-track{position:relative;height:10px;background:#eef3f6;border-radius:999px;width:100%;max-width:900px}
      .psdk-zoom-fill{position:absolute;left:0;top:0;bottom:0;background:#e6f7ff;border-radius:999px;width:50%}
      .psdk-zoom-controls{position:absolute;left:6px;right:6px;top:-22px;display:flex;align-items:center;justify-content:space-between}
      .psdk-group{display:flex;align-items:center;gap:8px;padding:6px 8px;background:transparent;border-radius:6px}
      .psdk-group-label{font-size:12px;color:#334155;margin-right:6px;font-weight:600}
      .psdk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px;width:36px;height:36px;border-radius:8px;background:transparent;border:none;cursor:pointer;color:#334155}
      .psdk-btn svg{width:18px;height:18px;opacity:0.9}
      .psdk-btn:focus{outline:none}
      .psdk-btn:hover{background:rgba(11,107,211,0.06);border-radius:8px}
      .psdk-btn.primary{background:#1f9a59;color:#fff;padding:6px 10px;border-radius:10px}
      .psdk-btn:active{transform:translateY(0)}
      .psdk-btn[disabled]{opacity:0.5;cursor:not-allowed}
      .psdk-group input{padding:6px 8px;border-radius:6px;border:1px solid #e6eef8;min-width:120px}
      .psdk-sep{width:1px;height:36px;background:#dbe6f2;margin:0 6px}
      .psdk-zoom-label{min-width:56px;text-align:center;font-weight:600;color:#1f2937}
      .psdk-thumbs{display:flex;gap:10px;overflow:auto;padding:10px;background:linear-gradient(180deg,#fbfeff,#f8fbff);border-top:1px solid #e6eef8;border-radius:6px}
      .psdk-thumb{width:110px;height:140px;flex:0 0 auto;border-radius:6px;overflow:hidden;box-shadow:0 8px 24px rgba(16,24,40,0.06);cursor:pointer;border:2px solid transparent;background:#fff}
      .psdk-thumb canvas{width:100%;height:100%;display:block}
      .psdk-thumb.selected{border-color:#0b6bd3;box-shadow:0 10px 30px rgba(11,107,211,0.08)}
      .psdk-found{animation:psdk-flash 1.4s ease-in-out}
      @keyframes psdk-flash{0%{box-shadow:0 0 0 0 rgba(11,107,211,0.12)}50%{box-shadow:0 0 0 8px rgba(11,107,211,0.06)}100%{box-shadow:0 0 0 0 rgba(11,107,211,0)}}
      .ribbon-tabs{display:flex;gap:6px;padding:6px 8px;background:#fff;border-bottom:1px solid #e2e8f0}
      .ribbon-tab{padding:8px 12px;border-radius:6px;font-weight:700;color:#1f2937;cursor:pointer}
      .ribbon-tab.active{background:linear-gradient(180deg,#eef6ff,#e6f0ff);box-shadow:0 2px 6px rgba(14,71,140,0.06);color:#0b6bd3}
      .psdk-dropdown{position:relative}
      .psdk-menu{position:absolute;top:40px;left:0;background:#fff;border:1px solid #e6eef8;border-radius:6px;box-shadow:0 12px 32px rgba(16,24,40,0.12);min-width:160px;padding:6px;display:none;z-index:10000}
      .psdk-menu .item{padding:8px 10px;cursor:pointer;border-radius:4px}
      .psdk-menu .item:hover{background:#f0f8ff}
      .psdk-icon{width:16px;height:16px;display:inline-block;vertical-align:middle}
      .psdk-find-highlight{position:absolute;background:rgba(255,235,59,0.35);border-radius:3px;pointer-events:none;box-shadow:0 8px 20px rgba(14,71,140,0.06);border:1px solid rgba(255,205,0,0.25)}
    </style>
    <style id="user-styles"></style>
    <div class="viewer" part="viewer"></div>
  `;

  class PDFSignViewer extends HTMLElement{
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(template.content.cloneNode(true));
      this._viewer = this._shadow.querySelector('.viewer');
      this._userStyleEl = this._shadow.querySelector('#user-styles');
      this._positions = []; // {id,page,xPercent,yPercent,label}
      this._nextId = 1;
      this._addMode = false;
      this._pdfDoc = null; // pdf.js document
      this._pdfBytes = null; // original bytes
      this._pageViewports = {}; // pageNum -> viewport at scale 1 (original PDF units)
      this._pageContainers = {}; // pageNum -> container element and page refs
      this._renderScale = null; // custom scale when user requests zoom
      this._thumbContainer = null; // thumbnails strip element
      this._clickHandler = this._onClick.bind(this);
      this._mousemoveHandler = this._onMouseMove.bind(this);
      this._mouseleaveHandler = this._onMouseLeave.bind(this);
      this._rectStartHandler = this._rectStart.bind(this);
      this._drawPositionHandler = this._drawPosition.bind(this);
      this._previewEl = null;
      this._labelEditor = null;
      this._dragState = null; // {id,page,offsetX,offsetY}
      this._undoStack = [];
      this._toolbarCreated = false;
    }

    // Persistence: enable/disable and internal save/load
    enablePersistence(enable = true){
      this._persistence = !!enable;
      if(this._persistence) this._loadPositionsFromStorage();
      return this._persistence;
    }

    _storageKey(){
      const src = this.getAttribute('src') || 'inline';
      return 'pdfsign:' + encodeURIComponent(src);
    }

    _savePositionsToStorage(){
      try{
        if(!this._persistence) return;
        const key = this._storageKey();
        const data = JSON.stringify(this._positions || []);
        localStorage.setItem(key, data);
      }catch(e){/* ignore storage errors */}
    }

    _loadPositionsFromStorage(){
      try{
        if(!this._persistence) return;
        const key = this._storageKey();
        const raw = localStorage.getItem(key);
        if(!raw) return;
        const arr = JSON.parse(raw);
        if(!Array.isArray(arr)) return;
        // restore positions after pages rendered
        const restore = ()=>{
          arr.forEach(p=>{
            // avoid id collisions
            p.id = this._nextId++;
            this._positions.push(p);
            this._renderMarker(p);
          });
          this.dispatchEvent(new CustomEvent('positions-restored',{detail:{count:arr.length}}));
        };
        if(this._pdfDoc) restore();
        else {
          // wait until loaded event
          const h = ()=>{ this.removeEventListener('loaded',h); restore(); };
          this.addEventListener('loaded', h);
        }
      }catch(e){/* ignore */}
    }

    _createMainToolbar(){
      if(this._toolbarCreated) return;
      try{
        // Build a simple, styled toolbar
        const toolbar = document.createElement('div'); 
        toolbar.className = 'psdk-toolbar';
        toolbar.innerHTML = `
          <div class="psdk-iconbar">
            <div style="display:flex;gap:6px;align-items:center">
              <button class="psdk-btn" title="Add Signature (Click)" data-action="addsig" style="background:#1f9a59;color:#fff;border-radius:6px;padding:6px 12px">✎ Click</button>
              <button class="psdk-btn" title="Draw Signature (Rectangle)" data-action="addsig-rect" style="background:#2d6fa3;color:#fff;border-radius:6px;padding:6px 12px">▭ Rect</button>
              <button class="psdk-btn" title="Handwrite Signature" data-action="addsig-draw" style="background:#7c3aed;color:#fff;border-radius:6px;padding:6px 12px">🖊 Draw</button>
            </div>
            <button class="psdk-btn" title="Menu" data-action="menu">☰</button>
            <button class="psdk-btn" title="Thumbnails" data-action="thumbs">📄</button>
            <button class="psdk-btn" title="Find" data-action="find">🔍</button>
            <input type="text" placeholder="Find..." class="psdk-find-input" style="padding:6px 10px;border:1px solid #dbe6f2;border-radius:6px;font-size:14px;width:160px" />
            <div style="flex:1"></div>
            <button class="psdk-btn" title="Zoom out" data-action="zoomout">−</button>
            <button class="psdk-btn psdk-zoom-label" style="min-width:50px;font-weight:600;color:#1f2937" title="Zoom">100%</button>
            <button class="psdk-btn" title="Zoom in" data-action="zoomin">+</button>
            <button class="psdk-btn" title="Preview" data-action="preview">👁</button>
            <button class="psdk-btn" title="Export" data-action="export">↓</button>
            <button class="psdk-btn" title="Print" data-action="print">🖨</button>
            <button class="psdk-btn" title="Undo" data-action="undo">↶</button>
            <button class="psdk-btn" title="Clear" data-action="clear" style="color:#ef4444">✕</button>
          </div>
        `;
        
        this._shadow.insertBefore(toolbar, this._viewer);
        
        // Wire event handlers
        const zoomLabelEl = toolbar.querySelector('.psdk-zoom-label');
        const findInput = toolbar.querySelector('.psdk-find-input');
        
        toolbar.querySelectorAll('[data-action]').forEach(btn=>{
          btn.addEventListener('click', async (ev)=>{
            const action = btn.dataset.action;
            if(action === 'addsig'){ 
              const isActive = this._addMode;
              this.enableAddMode(!isActive, 'click');
              btn.style.opacity = this._addMode ? '1' : '0.6';
              btn.style.boxShadow = this._addMode ? '0 0 0 3px rgba(31,154,89,0.3)' : 'none';
            }
            else if(action === 'addsig-rect'){ 
              const isActive = this._addMode && this._addMode === 'rect';
              this.enableAddMode(!isActive ? 'rect' : false);
              btn.style.opacity = (this._addMode === 'rect') ? '1' : '0.6';
              btn.style.boxShadow = (this._addMode === 'rect') ? '0 0 0 3px rgba(45,111,163,0.3)' : 'none';
            }
            else if(action === 'addsig-draw'){ 
              this.enableAddMode('draw');
            }
            else if(action === 'zoomin'){ await this.zoomIn(); this._updateZoomFill && this._updateZoomFill(); }
            else if(action === 'zoomout'){ await this.zoomOut(); this._updateZoomFill && this._updateZoomFill(); }
            else if(action === 'thumbs'){ this.toggleThumbnails(); }
            else if(action === 'find'){ this.findText(findInput.value || ''); }
            else if(action === 'export'){ this.exportAnnotatedPdf('annotated.pdf'); }
            else if(action === 'preview'){ this.previewAnnotatedPdf('annotated-preview.pdf'); }
            else if(action === 'print'){ this.printAnnotated(); }
            else if(action === 'undo'){ this.undoLast(); }
            else if(action === 'clear'){ this.clearPositions(); }
          });
        });
        
        // Setup zoom updater
        this._updateZoomFill = ()=>{
          try{
            const pct = Math.round((this._renderScale || 1) * 100);
            zoomLabelEl.textContent = pct + '%';
          }catch(e){ console.warn('psdk: updateZoomFill failed', e); }
        };
        this._updateZoomFill();
        
        // Create zoombar (visual track)
        const zoombar = document.createElement('div'); 
        zoombar.className = 'psdk-zoombar';
        zoombar.innerHTML = `
          <div class="psdk-zoom-track" title="Click to zoom" style="cursor:pointer">
            <div class="psdk-zoom-fill"></div>
          </div>
          <div class="psdk-zoom-label" style="margin-left:12px">${Math.round((this._renderScale||1)*100)}%</div>
        `;
        this._shadow.appendChild(zoombar);
        
        const zoomTrack = zoombar.querySelector('.psdk-zoom-track');
        const zoomFill = zoombar.querySelector('.psdk-zoom-fill');
        const zoomLabelBar = zoombar.querySelector('.psdk-zoom-label');
        
        // Update both toolbar label and zoombar on zoom change
        const updateBothZoomLabels = ()=>{
          const pct = Math.round((this._renderScale || 1) * 100);
          zoomLabelEl.textContent = pct + '%';
          zoomLabelBar.textContent = pct + '%';
          const min = 0.2, max = 3;
          const v = Math.max(min, Math.min(max, this._renderScale || 1));
          const fillPct = Math.round(((v - min) / (max - min)) * 100);
          zoomFill.style.width = Math.max(2, Math.min(100, fillPct)) + '%';
        };
        this._updateZoomFill = updateBothZoomLabels;
        updateBothZoomLabels();
        
        // Click-to-zoom on track
        zoomTrack.addEventListener('click', (ev)=>{
          const rect = zoomTrack.getBoundingClientRect();
          const x = ev.clientX - rect.left;
          const pct = x / rect.width;
          const min = 0.2, max = 3;
          const newScale = min + pct * (max - min);
          this.zoomTo(newScale);
          updateBothZoomLabels();
        });
        
        console.log('psdk: toolbar created');
        this._toolbarCreated = true;
        
        // Add top padding to viewer
        try{ this._viewer.style.paddingTop = '96px'; }catch(e){}
      }catch(e){ console.warn('Failed to create toolbar', e); }
    }

    // Apply a raw CSS string into the component's shadow root (overrides defaults)
    setCustomCSS(css){
      if(!this._userStyleEl) return;
      this._userStyleEl.textContent = css || '';
      this.dispatchEvent(new CustomEvent('styles-applied',{detail:{length: css?css.length:0}}));
    }

    // Load CSS from a URL and apply it
    async loadCustomCSS(url){
      const resp = await fetch(url);
      if(!resp.ok) throw new Error('Failed to fetch css '+url);
      const css = await resp.text();
      this.setCustomCSS(css);
    }

    // Simple theme helper
    applyTheme(name){
      if(name === 'pdftron'){
        this.setCustomCSS(PDFTRON_CSS);
      }
    }

    connectedCallback(){
      if(this.hasAttribute('src')) this.load(this.getAttribute('src'));
      if(this.hasAttribute('height')) this.style.height = this.getAttribute('height');
      // create the toolbar inside the component (SDK owns ribbon UI)
      this._createMainToolbar();
      // visible host badge for debugging / cache verification
      try{ this.dataset.psdk = 'v20251123'; this.style.outline = '3px solid rgba(16,185,129,0.18)'; }catch(e){}
    }

    disconnectedCallback(){
      this.enableAddMode(false);
    }

    async load(src){
      // load pdf.js runtime
      if(!window.pdfjsLib){
        const loaded = await loadScriptCandidates(PDFJS_CANDIDATES);
        // try to set workerSrc based on the loaded script location
        try{
          const workerCandidate = loaded.replace(/pdf\.min\.js$/,'pdf.worker.min.js');
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerCandidate;
        }catch(e){
          // fallback: leave workerSrc unset and let pdf.js attempt defaults
        }
      }

      // fetch bytes
      const resp = await fetch(src);
      const bytes = await resp.arrayBuffer();
      this._pdfBytes = bytes;
      const loading = window.pdfjsLib.getDocument({data: bytes});
      this._pdfDoc = await loading.promise;
      await this._renderAllPages();
      this.dispatchEvent(new CustomEvent('loaded',{detail:{pages:this._pdfDoc.numPages}}));
    }

    async _renderAllPages(){
      this._viewer.innerHTML = '';
      this._pageContainers = {};
      // remove thumbs if present
      if(this._thumbContainer){ this._thumbContainer.remove(); this._thumbContainer = null; }
      for(let i=1;i<=this._pdfDoc.numPages;i++){
        const page = await this._pdfDoc.getPage(i);
        const viewport = page.getViewport({scale:1});
        this._pageViewports[i] = {width: viewport.width, height: viewport.height};

        // create container
        const container = document.createElement('div');
        container.className = 'page';
        container.style.width = Math.min(this.clientWidth - 32, viewport.width) + 'px';
        container.style.height = 'auto';
        container.dataset.pagenum = i;
        container.style.position = 'relative';

        // canvas
        const canvas = document.createElement('canvas');
        const scale = this._renderScale || ((this.clientWidth - 32) / viewport.width);
        const scaledViewport = page.getViewport({scale});
        canvas.width = Math.round(scaledViewport.width);
        canvas.height = Math.round(scaledViewport.height);
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';

        const ctx = canvas.getContext('2d');
        await page.render({canvasContext: ctx, viewport: scaledViewport}).promise;

        // overlay for markers
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.style.width = canvas.style.width;
        overlay.style.height = canvas.style.height;
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';

        container.appendChild(canvas);
        container.appendChild(overlay);
        this._viewer.appendChild(container);

        this._pageContainers[i] = {container,canvas,overlay,scale,viewportWidth:viewport.width,viewportHeight:viewport.height, pageRef: page};
      }
      // re-render markers (positions) on top of new canvases
      (this._positions || []).forEach(p=> this._renderMarker(p));
      // create thumbnail strip
      this._createThumbnails();
    }

    enableAddMode(mode=false){
      // mode can be: false (disabled), 'click' (point), 'rect' (rectangle), 'draw' (handwriting)
      this._addMode = mode;
      if(this._addMode && this._addMode !== 'draw'){
        // click or rect mode
        this._viewer.querySelectorAll('.overlay').forEach(o=>o.classList.add('capture'));
        if(this._addMode === 'click'){
          this._viewer.addEventListener('click', this._clickHandler);
          this._viewer.addEventListener('mousemove', this._mousemoveHandler);
          this._viewer.addEventListener('mouseleave', this._mouseleaveHandler);
        } else if(this._addMode === 'rect'){
          this._viewer.addEventListener('mousedown', this._rectStartHandler);
        }
        this._ensurePreview();
      } else if(this._addMode === 'draw'){
        // handwriting mode - enable position selection first
        this._viewer.querySelectorAll('.overlay').forEach(o=>o.classList.add('capture'));
        this._viewer.addEventListener('mousedown', this._drawPositionHandler);
        this._ensurePreview();
        return;
      } else {
        // disable all modes
        this._viewer.querySelectorAll('.overlay').forEach(o=>o.classList.remove('capture'));
        this._viewer.removeEventListener('click', this._clickHandler);
        this._viewer.removeEventListener('mousemove', this._mousemoveHandler);
        this._viewer.removeEventListener('mouseleave', this._mouseleaveHandler);
        this._viewer.removeEventListener('mousedown', this._rectStartHandler);
        this._viewer.removeEventListener('mousedown', this._drawPositionHandler);
        if(this._previewEl) this._previewEl.remove(); this._previewEl = null;
      }
    }

    _ensurePreview(){
      if(this._previewEl) return;
      const p = document.createElement('div');
      p.className = 'preview';
      p.style.display = 'none';
      p.textContent = '+';
      this._previewEl = p;
      this._viewer.appendChild(p);
    }

    _onMouseMove(ev){
      if(!this._addMode || !this._previewEl) return;
      // find overlay ancestor
      let node = ev.target;
      while(node && node!==this._viewer){
        if(node.classList && node.classList.contains('overlay')) break;
        node = node.parentNode;
      }
      if(!node || node===this._viewer){ this._previewEl.style.display = 'none'; return; }
      const overlay = node;
      const rect = overlay.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      this._previewEl.style.display = 'flex';
      this._previewEl.style.left = (rect.left + x) - this._viewer.getBoundingClientRect().left + 'px';
      this._previewEl.style.top = (rect.top + y) - this._viewer.getBoundingClientRect().top + 'px';
    }

    _onMouseLeave(ev){
      if(this._previewEl) this._previewEl.style.display = 'none';
    }

    _rectStart(ev){
      if(this._addMode !== 'rect') return;
      let node = ev.target;
      while(node && node!==this._viewer){
        if(node.classList && node.classList.contains('overlay')) break;
        node = node.parentNode;
      }
      if(!node || node===this._viewer) return;
      
      const overlay = node;
      const container = overlay.parentNode;
      const pageNum = parseInt(container.dataset.pagenum,10);
      const overlayRect = overlay.getBoundingClientRect();
      const startX = ev.clientX - overlayRect.left;
      const startY = ev.clientY - overlayRect.top;
      
      // create selection box
      const selBox = document.createElement('div');
      selBox.className = 'selection-box';
      selBox.style.left = startX + 'px';
      selBox.style.top = startY + 'px';
      selBox.style.width = '0px';
      selBox.style.height = '0px';
      overlay.appendChild(selBox);
      
      const onMove = (moveEv)=>{
        const currentX = moveEv.clientX - overlayRect.left;
        const currentY = moveEv.clientY - overlayRect.top;
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        const l = Math.min(startX, currentX);
        const t = Math.min(startY, currentY);
        selBox.style.left = l + 'px';
        selBox.style.top = t + 'px';
        selBox.style.width = w + 'px';
        selBox.style.height = h + 'px';
      };
      
      const onUp = (upEv)=>{
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        
        const currentX = upEv.clientX - overlayRect.left;
        const currentY = upEv.clientY - overlayRect.top;
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        
        if(w < 10 || h < 10){
          selBox.remove();
          return; // too small, ignore
        }
        
        const l = Math.min(startX, currentX);
        const t = Math.min(startY, currentY);
        
        // convert to percentages
        const xPercent = (l / overlayRect.width) * 100;
        const yPercent = (t / overlayRect.height) * 100;
        const widthPercent = (w / overlayRect.width) * 100;
        const heightPercent = (h / overlayRect.height) * 100;
        
        selBox.remove();
        
        // show label editor
        const clientX = upEv.clientX;
        const clientY = upEv.clientY;
        this._showLabelEditor({
          page:pageNum,
          xPercent:+xPercent.toFixed(3),
          yPercent:+yPercent.toFixed(3),
          widthPercent:+widthPercent.toFixed(3),
          heightPercent:+heightPercent.toFixed(3)
        }, overlay, clientX, clientY);
      };
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    _drawPosition(ev){
      if(this._addMode !== 'draw') return;
      let node = ev.target;
      while(node && node!==this._viewer){
        if(node.classList && node.classList.contains('overlay')) break;
        node = node.parentNode;
      }
      if(!node || node===this._viewer) return;
      
      const overlay = node;
      const container = overlay.parentNode;
      const pageNum = parseInt(container.dataset.pagenum,10);
      const overlayRect = overlay.getBoundingClientRect();
      const x = ev.clientX - overlayRect.left;
      const y = ev.clientY - overlayRect.top;
      
      // convert to percentages
      const xPercent = (x / overlayRect.width) * 100;
      const yPercent = (y / overlayRect.height) * 100;
      
      console.log('psdk: draw position selected', {pageNum, xPercent, yPercent});
      
      // disable draw mode while showing modal
      this.enableAddMode(false);
      
      // show handwriting modal with the selected position
      this._showHandwriteModal(pageNum, xPercent, yPercent);
    }

    _showHandwriteModal(pageNum=1, xPercent=10, yPercent=10){
      console.log('psdk: showing handwrite modal at', {pageNum, xPercent, yPercent});
      
      // show a modal with a canvas for handwriting
      const modal = document.createElement('div');
      modal.className = 'handwrite-modal';
      modal.innerHTML = `
        <h3 style="margin:0 0 12px 0;color:#1f2937">Draw Your Signature on Page ${pageNum}</h3>
        <p style="margin:0 0 8px 0;color:#666;font-size:12px">Position: ${Math.round(xPercent)}%, ${Math.round(yPercent)}%</p>
        <canvas class="handwrite-canvas"></canvas>
        <div class="handwrite-btns">
          <button class="clear-btn">Clear</button>
          <button class="primary save-btn">Save Signature</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      `;
      
      this._shadow.appendChild(modal);
      
      const canvas = modal.querySelector('.handwrite-canvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas resolution
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1f2937';
      
      let isDrawing = false;
      
      canvas.addEventListener('mousedown', (e)=>{
        isDrawing = true;
        const r = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
      });
      
      canvas.addEventListener('mousemove', (e)=>{
        if(!isDrawing) return;
        const r = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
        ctx.stroke();
      });
      
      canvas.addEventListener('mouseup', ()=>{ isDrawing = false; });
      canvas.addEventListener('mouseleave', ()=>{ isDrawing = false; });
      
      modal.querySelector('.clear-btn').addEventListener('click', ()=>{
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
      
      modal.querySelector('.cancel-btn').addEventListener('click', ()=>{
        modal.remove();
        console.log('psdk: handwrite cancelled');
      });
      
      modal.querySelector('.save-btn').addEventListener('click', ()=>{
        // convert canvas to image data and save as a marker at the selected position
        const imgData = canvas.toDataURL('image/png');
        console.log('psdk: handwrite saved, image data length:', imgData.length);
        modal.remove();
        
        // Directly add the position with image
        try {
          const pos = {id:this._nextId++, page:pageNum, xPercent:xPercent, yPercent:yPercent, label:null, image:imgData};
          this._positions.push(pos);
          console.log('psdk: position added to array', pos);
          this._renderMarker(pos);
          console.log('psdk: marker rendered');
          this.dispatchEvent(new CustomEvent('position-added',{detail:pos}));
          this._savePositionsToStorage();
        } catch(e) {
          console.error('psdk: error saving handwriting', e);
        }
      });
    }

    _onClick(ev){
      if(!this._addMode) return;
      // find overlay ancestor
      let node = ev.target;
      while(node && node!==this._viewer){
        if(node.classList && node.classList.contains('overlay')) break;
        node = node.parentNode;
      }
      if(!node || node===this._viewer) return;
      const overlay = node;
      const container = overlay.parentNode;
      const pageNum = parseInt(container.dataset.pagenum,10);
      const rect = overlay.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      // show inline label editor before finalizing
      this._showLabelEditor({page:pageNum,xPercent:+x.toFixed(3),yPercent:+y.toFixed(3)}, overlay, ev.clientX, ev.clientY);
    }

    _showLabelEditor(pos, overlay, clientX, clientY){
      // remove existing editor
      if(this._labelEditor) this._labelEditor.remove();
      const editor = document.createElement('div');
      editor.className = 'label-editor';
      const input = document.createElement('input'); input.placeholder = 'Label (opt)';
      const ok = document.createElement('button'); ok.textContent = 'Add';
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.className = 'secondary';
      editor.appendChild(input); editor.appendChild(ok); editor.appendChild(cancel);
      
      // position editor relative to viewer - handle both regular and handwriting cases
      const viewerRect = this._viewer.getBoundingClientRect();
      if(clientX === 0 && clientY === 0){
        // handwriting case - center the editor
        editor.style.left = (viewerRect.width / 2 - 100) + 'px';
        editor.style.top = (viewerRect.height / 2 - 60) + 'px';
      } else {
        editor.style.left = (clientX - viewerRect.left + 6) + 'px';
        editor.style.top = (clientY - viewerRect.top + 6) + 'px';
      }
      this._viewer.appendChild(editor);
      input.focus();

      const cleanup = ()=>{ if(this._labelEditor){ this._labelEditor.remove(); this._labelEditor = null; } }
      ok.addEventListener('click', ()=>{
        const lbl = input.value ? input.value.trim() : null;
        const posData = {page:pos.page,xPercent:pos.xPercent,yPercent:pos.yPercent,label:lbl};
        // pass through rectangle or image data if present
        if(pos.widthPercent !== undefined) posData.widthPercent = pos.widthPercent;
        if(pos.heightPercent !== undefined) posData.heightPercent = pos.heightPercent;
        if(pos.image !== undefined) posData.image = pos.image;
        const added = this.addPosition(posData);
        cleanup();
      });
      cancel.addEventListener('click', ()=>{ cleanup(); });
      this._labelEditor = editor;
    }

    addPosition({page=1,xPercent,yPercent,label=null,widthPercent=null,heightPercent=null,image=null}){
      if(typeof xPercent !== 'number' || typeof yPercent !== 'number') throw new Error('xPercent and yPercent required');
      const pos = {id:this._nextId++, page, xPercent, yPercent, label, widthPercent, heightPercent, image};
      this._positions.push(pos);
      this._renderMarker(pos);
      console.log('psdk: position added', pos);
      this.dispatchEvent(new CustomEvent('position-added',{detail:pos}));
        this._savePositionsToStorage();
      return pos;
    }

    _renderMarker(pos){
      const pageInfo = this._pageContainers[pos.page];
      if(!pageInfo) {
        console.warn('psdk: pageInfo not found for page', pos.page);
        return;
      }
      
      console.log('psdk: rendering marker', {id:pos.id, hasImage: !!pos.image, hasRect: !!(pos.widthPercent && pos.heightPercent), page: pos.page});
      
      // Check if this is a rectangle or image marker
      if(pos.widthPercent !== undefined && pos.heightPercent !== undefined){
        // Rectangle marker
        const m = document.createElement('div');
        m.className = 'marker enter';
        m.title = pos.label ? pos.label : `#${pos.id}`;
        m.dataset.id = pos.id;
        m.style.left = pos.xPercent + '%';
        m.style.top = pos.yPercent + '%';
        m.style.width = pos.widthPercent + '%';
        m.style.height = pos.heightPercent + '%';
        m.style.minWidth = 'auto';
        m.style.minHeight = 'auto';
        m.style.padding = '0';
        m.style.borderRadius = '4px';
        m.style.background = 'rgba(255,107,107,0.15)';
        m.style.border = '2px solid #ff6b6b';
        m.style.display = 'flex';
        m.style.alignItems = 'flex-end';
        m.style.justifyContent = 'flex-end';
        m.style.overflow = 'visible';
        
        // label overlay
        if(pos.label){
          const label = document.createElement('span');
          label.style.cssText = 'position:absolute;bottom:-20px;left:0;background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;white-space:nowrap;pointer-events:none';
          label.textContent = pos.label;
          m.appendChild(label);
        }
        
        m.addEventListener('animationend', ()=> m.classList.remove('enter'));
        
        // delete button
        const del = document.createElement('button');
        del.className = 'del';
        del.type = 'button';
        del.innerHTML = '×';
        del.style.cssText = 'position:absolute;right:-8px;top:-8px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;border:none;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer';
        del.addEventListener('click', (e)=>{
          e.stopPropagation();
          this.removePosition(pos.id);
        });
        m.appendChild(del);
        
        pageInfo.overlay.appendChild(m);
        return;
      }
      
      if(pos.image){
        // Handwritten signature image
        const m = document.createElement('div');
        m.className = 'marker enter';
        m.title = pos.label ? pos.label : `#${pos.id}`;
        m.dataset.id = pos.id;
        m.style.left = pos.xPercent + '%';
        m.style.top = pos.yPercent + '%';
        m.style.width = '140px';
        m.style.height = '80px';
        m.style.padding = '0';
        m.style.minWidth = 'auto';
        m.style.minHeight = 'auto';
        m.style.borderRadius = '4px';
        m.style.border = '1px solid #ddd';
        m.style.background = '#fff';
        m.style.overflow = 'hidden';
        
        const img = document.createElement('img');
        img.src = pos.image;
        img.style.cssText = 'width:100%;height:100%;object-fit:contain';
        m.appendChild(img);
        
        m.addEventListener('animationend', ()=> m.classList.remove('enter'));
        
        // delete button
        const del = document.createElement('button');
        del.className = 'del';
        del.type = 'button';
        del.innerHTML = '×';
        del.style.cssText = 'position:absolute;right:-8px;top:-8px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;border:none;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer';
        del.addEventListener('click', (e)=>{
          e.stopPropagation();
          this.removePosition(pos.id);
        });
        m.appendChild(del);
        
        pageInfo.overlay.appendChild(m);
        return;
      }
      
      // Standard point marker
      const m = document.createElement('div');
      m.className = 'marker enter';
      m.title = pos.label ? pos.label : `#${pos.id}`;
      m.dataset.id = pos.id;
      m.style.left = pos.xPercent + '%';
      m.style.top = pos.yPercent + '%';
      m.textContent = pos.label ? pos.label : pos.id;
      // remove enter class after animation
      m.addEventListener('animationend', ()=> m.classList.remove('enter'));

      // delete button
      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.innerHTML = '×';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        this.removePosition(pos.id);
      });
      m.appendChild(del);

      // drag support
      m.addEventListener('mousedown', (ev)=>{
        ev.stopPropagation(); ev.preventDefault();
        this._startMarkerDrag(ev, pos, pageInfo);
      });
      pageInfo.overlay.appendChild(m);
    }

    removePosition(id){
      const idx = this._positions.findIndex(p=>p.id === id);
      if(idx === -1) return null;
      const [removed] = this._positions.splice(idx,1);
      // remove DOM marker
      Object.values(this._pageContainers).forEach(p=>{
        const el = p.overlay.querySelector(`.marker[data-id="${id}"]`);
        if(el) el.remove();
      });
      // push to undo stack
      this._undoStack.push(removed);
        this._savePositionsToStorage();
      this.dispatchEvent(new CustomEvent('position-removed',{detail:removed}));
      return removed;
    }

    undoLast(){
      const last = this._undoStack.pop();
      if(!last) return null;
      this._positions.push(last);
      this._renderMarker(last);
      this.dispatchEvent(new CustomEvent('position-restored',{detail:last}));
        this._savePositionsToStorage();
      return last;
    }

    _startMarkerDrag(ev, pos, pageInfo){
      const marker = ev.currentTarget;
      marker.classList.add('dragging');
      const overlay = pageInfo.overlay;
      const rect = overlay.getBoundingClientRect();
      const startX = ev.clientX; const startY = ev.clientY;
      const currentLeft = parseFloat(marker.style.left);
      const currentTop = parseFloat(marker.style.top);
      const onMove = (moveEv)=>{
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        // compute percent shift
        const px = ((currentLeft/100) * rect.width + dx) / rect.width * 100;
        const py = ((currentTop/100) * rect.height + dy) / rect.height * 100;
        marker.style.left = Math.max(0,Math.min(100,px)) + '%';
        marker.style.top = Math.max(0,Math.min(100,py)) + '%';
      };
      const onUp = async (upEv)=>{
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        marker.classList.remove('dragging');
        // update stored position
        const newX = parseFloat(marker.style.left);
        const newY = parseFloat(marker.style.top);
        pos.xPercent = newX; pos.yPercent = newY;
        this.dispatchEvent(new CustomEvent('position-updated',{detail:pos}));
          this._savePositionsToStorage();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    clearPositions(){
      this._positions = [];
      this._undoStack = [];
      Object.values(this._pageContainers).forEach(p=>p.overlay.querySelectorAll('.marker').forEach(n=>n.remove()));
    }

    getPositions(){ return this._positions.slice(); }

    exportPositions(){ return JSON.stringify(this._positions); }

    async exportAnnotatedPdf(filename='annotated.pdf', opts={download:true}){
      // ensure pdf-lib is loaded
      if(!window.PDFLib) await loadScript(PDF_LIB_URL);
      const { PDFDocument, rgb } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this._pdfBytes);

      for(const pos of this._positions){
        const pageIndex = pos.page - 1;
        const pdfPage = pdfDoc.getPage(pageIndex);
        const viewport = this._pageViewports[pos.page];
        if(!viewport) continue;

        // compute PDF points (origin bottom-left). pos.xPercent,pos.yPercent are relative to the rendered canvas
        const x = (pos.xPercent/100) * viewport.width;
        const yFromTop = (pos.yPercent/100) * viewport.height;
        const y = viewport.height - yFromTop; // convert to bottom-left origin

        const size = Math.max(viewport.width, viewport.height) * 0.02; // 2% of larger dimension
        pdfPage.drawRectangle({x: x - size/2, y: y - size/2, width: size, height: size, color: rgb(1,0,0), opacity:0.8});
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], {type:'application/pdf'});
      if(opts && opts.download === false){
        // return the blob for caller handling
        return blob;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }

    // Viewer helpers: zoom, fit, navigation, thumbnails, find, print
    async zoomTo(scale){
      this._renderScale = Math.max(0.25, Math.min(5, scale));
      if(!this._pdfDoc) return;
      await this._renderAllPages();
      this.dispatchEvent(new CustomEvent('zoom-changed',{detail:{scale:this._renderScale}}));
    }

    async zoomIn(){ await this.zoomTo((this._renderScale || 1) + 0.25); }
    async zoomOut(){ await this.zoomTo((this._renderScale || 1) - 0.25); }

    async fitToWidth(){
      if(!this._pdfDoc) return;
      // compute based on first page
      const first = this._pageContainers[1];
      if(!first) return;
      const fit = (this.clientWidth - 32) / first.viewportWidth;
      await this.zoomTo(fit);
    }

    goToPage(n){
      n = Math.max(1, Math.min(this._pdfDoc?this._pdfDoc.numPages:n, n));
      const info = this._pageContainers[n];
      if(info && info.container) info.container.scrollIntoView({behavior:'smooth', block:'center'});
    }

    _createThumbnails(){
      try{
        if(this._thumbContainer) this._thumbContainer.remove();
        const wrap = document.createElement('div'); wrap.className = 'psdk-thumbs';
        for(let i=1;i<=this._pdfDoc.numPages;i++){
          const pinfo = this._pageContainers[i];
          const thumb = document.createElement('div'); thumb.className='psdk-thumb'; thumb.dataset.page = i;
          // render a tiny canvas based on pageRef if available
          const cvs = document.createElement('canvas');
          cvs.style.width = '100%'; cvs.style.height = '100%';
          thumb.appendChild(cvs);
          wrap.appendChild(thumb);
          (async ()=>{
            try{
              const page = pinfo && pinfo.pageRef ? pinfo.pageRef : await this._pdfDoc.getPage(i);
              const scale = Math.min(0.18, (96 / pinfo.viewportWidth));
              const vp = page.getViewport({scale});
              cvs.width = Math.round(vp.width); cvs.height = Math.round(vp.height);
              const ctx = cvs.getContext('2d');
              await page.render({canvasContext:ctx, viewport:vp}).promise;
            }catch(e){}
          })();
          thumb.addEventListener('click', ()=>{ this.goToPage(i); this._markSelectedThumb(i); });
        }
        this._viewer.after(wrap);
        this._thumbContainer = wrap;
      }catch(e){/* ignore */}
    }

    _markSelectedThumb(n){ if(!this._thumbContainer) return; this._thumbContainer.querySelectorAll('.psdk-thumb').forEach(t=>t.classList.toggle('selected', parseInt(t.dataset.page,10)===n)); }

    toggleThumbnails(){ if(this._thumbContainer){ this._thumbContainer.remove(); this._thumbContainer = null; } else this._createThumbnails(); }

    async findText(query){
      if(!query || !this._pdfDoc) return null;
      const needle = String(query).toLowerCase();
      // clear previous highlights
      this._clearFindHighlights();
      for(let i=1;i<=this._pdfDoc.numPages;i++){
        try{
          const page = await this._pdfDoc.getPage(i);
          const viewport = page.getViewport({scale: this._pageContainers[i] ? this._pageContainers[i].scale : 1});
          const tc = await page.getTextContent();
          // build joined string and track item indices
          let joint = '';
          const items = tc.items || [];
          for(let idx=0; idx<items.length; idx++) joint += (items[idx].str || '') + ' ';
          if(joint.toLowerCase().indexOf(needle) !== -1){
            // found on this page — find items that contain the query and highlight their bounding boxes
            const matches = [];
            for(let k=0;k<items.length;k++){
              const s = (items[k].str||'').toLowerCase();
              if(s.indexOf(needle) !== -1 || needle.indexOf(s) !== -1 || s.includes(needle)){
                // compute transform-based bbox
                try{
                  const t = window.pdfjsLib.Util.transform(viewport.transform, items[k].transform);
                  const x = t[4];
                  const y = t[5];
                  const w = items[k].width * viewport.scale;
                  const h = Math.abs(items[k].height || (Math.hypot(t[2], t[3]) || 10));
                  matches.push({x,y,w,h});
                }catch(e){}
              }
            }
            if(matches.length){
              this.goToPage(i);
              const info = this._pageContainers[i];
              if(info && info.overlay){
                const rect = info.overlay.getBoundingClientRect();
                matches.forEach(m=>{
                  const el = document.createElement('div'); el.className='psdk-find-highlight';
                  // position relative to overlay (pdf canvas coords map to overlay coords)
                  const left = (m.x / (info.canvas.width)) * 100;
                  const top = (m.y / (info.canvas.height)) * 100;
                  const widthP = (m.w / (info.canvas.width)) * 100;
                  const heightP = (m.h / (info.canvas.height)) * 100;
                  el.style.left = left + '%'; el.style.top = top + '%'; el.style.width = widthP + '%'; el.style.height = heightP + '%';
                  info.overlay.appendChild(el);
                });
              }
              this._markSelectedThumb(i);
              this.dispatchEvent(new CustomEvent('find-result',{detail:{page:i,query}}));
              return {page:i};
            }
          }
        }catch(e){/* continue */}
      }
      this.dispatchEvent(new CustomEvent('find-result',{detail:{page:null,query}}));
      return null;
    }

    _clearFindHighlights(){
      try{
        Object.values(this._pageContainers).forEach(info=>{
          if(!info || !info.overlay) return;
          info.overlay.querySelectorAll('.psdk-find-highlight').forEach(n=>n.remove());
        });
      }catch(e){}
    }

    async printAnnotated(){
      const blob = await this.exportAnnotatedPdf('print.pdf',{download:false});
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      const to = setInterval(()=>{ try{ if(w && w.document && w.document.readyState==='complete'){ w.print(); clearInterval(to);} }catch(e){} },250);
    }

    // Show an embedded preview of the annotated PDF inside the viewer shadow DOM
    async previewAnnotatedPdf(filename='annotated.pdf'){
      const blob = await this.exportAnnotatedPdf(filename,{download:false});
      const existing = this._shadow.querySelector('.psdk-preview-container');
      if(existing) existing.remove();

      if(!window.pdfjsLib){
        const loaded = await loadScriptCandidates(PDFJS_CANDIDATES);
        try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc = loaded.replace(/pdf\.min\.js$/,'pdf.worker.min.js'); }catch(e){}
      }

      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({data: arrayBuffer});
      const pdf = await loadingTask.promise;

      const container = document.createElement('div');
      container.className = 'psdk-preview-container';
      Object.assign(container.style,{
        position:'absolute',left:'8px',top:'8px',right:'8px',bottom:'8px',background:'rgba(255,255,255,0.98)',zIndex:'9999',borderRadius:'6px',boxShadow:'0 18px 48px rgba(0,0,0,0.45)',overflow:'hidden',display:'flex',flexDirection:'column'
      });

      // toolbar with prev/next and zoom
      const toolbarWrapper = document.createElement('div');
      toolbarWrapper.style.display = 'flex';
      toolbarWrapper.style.flexDirection = 'column';

      // ribbon tabs
      const tabs = document.createElement('div'); tabs.className = 'ribbon-tabs';
      const tabHome = document.createElement('div'); tabHome.className='ribbon-tab active'; tabHome.textContent='Home';
      const tabView = document.createElement('div'); tabView.className='ribbon-tab'; tabView.textContent='View';
      tabs.appendChild(tabHome); tabs.appendChild(tabView);

      const toolbar = document.createElement('div');
      toolbar.className = 'psdk-toolbar';

      // File group (Download / Print + dropdown)
      const fileGroup = document.createElement('div'); fileGroup.className = 'psdk-group';
      const fileLabel = document.createElement('div'); fileLabel.className='psdk-group-label'; fileLabel.textContent = 'File';
      const downloadBtn = document.createElement('button'); downloadBtn.className='psdk-btn';
      downloadBtn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v10" stroke="#0b6bd3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11l4 4 4-4" stroke="#0b6bd3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Download`;
      const printBtn = document.createElement('button'); printBtn.className='psdk-btn';
      printBtn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="18" height="11" stroke="#0b6bd3" stroke-width="2" rx="2"/><path d="M7 12h10" stroke="#0b6bd3" stroke-width="2" stroke-linecap="round"/></svg>Print`;
      // dropdown
      const fileDropdownWrap = document.createElement('div'); fileDropdownWrap.className='psdk-dropdown';
      const fileMore = document.createElement('button'); fileMore.className='psdk-btn'; fileMore.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>More`;
      const fileMenu = document.createElement('div'); fileMenu.className='psdk-menu';
      fileMenu.innerHTML = '<div class="item">Export as PDF</div><div class="item">Export All</div>';
      fileDropdownWrap.appendChild(fileMore); fileDropdownWrap.appendChild(fileMenu);
      fileGroup.appendChild(fileLabel); fileGroup.appendChild(downloadBtn); fileGroup.appendChild(printBtn); fileGroup.appendChild(fileDropdownWrap);

      // Navigation group (Prev / Page / Next)
      const navGroup = document.createElement('div'); navGroup.className='psdk-group';
      const navLabel = document.createElement('div'); navLabel.className='psdk-group-label'; navLabel.textContent='Navigate';
      const prevBtn = document.createElement('button'); prevBtn.className='psdk-btn small'; prevBtn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>`;
      const pageIndicator = document.createElement('input'); pageIndicator.type='number'; pageIndicator.min='1'; pageIndicator.value='1'; pageIndicator.style.width='64px'; pageIndicator.style.padding='6px'; pageIndicator.style.border='1px solid #dbe6f2'; pageIndicator.style.borderRadius='6px';
      const nextBtn = document.createElement('button'); nextBtn.className='psdk-btn small'; nextBtn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>`;
      navGroup.appendChild(navLabel); navGroup.appendChild(prevBtn); navGroup.appendChild(pageIndicator); navGroup.appendChild(nextBtn);

      // View group (Zoom)
      const viewGroup = document.createElement('div'); viewGroup.className='psdk-group';
      const viewLabel = document.createElement('div'); viewLabel.className='psdk-group-label'; viewLabel.textContent='View';
      const zoomOut = document.createElement('button'); zoomOut.className='psdk-btn small'; zoomOut.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M19 19l-4-4" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>`;
      const zoomLabel = document.createElement('div'); zoomLabel.className='psdk-zoom-label'; zoomLabel.textContent='100%';
      const zoomIn = document.createElement('button'); zoomIn.className='psdk-btn small'; zoomIn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>`;
      viewGroup.appendChild(viewLabel); viewGroup.appendChild(zoomOut); viewGroup.appendChild(zoomLabel); viewGroup.appendChild(zoomIn);

      // Actions group (Close)
      const actionGroup = document.createElement('div'); actionGroup.className='psdk-group';
      const closeBtn = document.createElement('button'); closeBtn.className='psdk-btn'; closeBtn.innerHTML = `<svg class="psdk-icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#0b6bd3" stroke-width="2" fill="none"/></svg>Close`;
      actionGroup.appendChild(closeBtn);

      toolbar.appendChild(fileGroup);
      toolbar.appendChild(document.createElement('div'));
      toolbar.appendChild(navGroup);
      toolbar.appendChild(document.createElement('div'));
      toolbar.appendChild(viewGroup);
      toolbar.appendChild(document.createElement('div'));
      toolbar.appendChild(actionGroup);

      toolbarWrapper.appendChild(tabs);
      toolbarWrapper.appendChild(toolbar);

      const pagesWrap = document.createElement('div');
      Object.assign(pagesWrap.style,{flex:'1 1 auto',overflow:'auto',padding:'12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'});

      container.appendChild(toolbar);
      container.appendChild(pagesWrap);
      this._shadow.appendChild(container);

      let scale = 1.0;
      const pageStates = new Array(pdf.numPages+1).fill(null); // holds {rendered:boolean,canvas:...}
      let currentPage = 1;

      // create placeholders
      for(let i=1;i<=pdf.numPages;i++){
        const placeholder = document.createElement('div');
        placeholder.className = 'psdk-page';
        placeholder.dataset.page = i;
        placeholder.style.minHeight = '80px';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.background = '#fff';
        placeholder.style.borderRadius = '4px';
        placeholder.style.boxShadow = '0 6px 18px rgba(20,30,40,0.06)';
        pagesWrap.appendChild(placeholder);
        pageStates[i] = {rendered:false,placeholder};
      }

      // render a single page when needed
      const renderPage = async (i)=>{
        const st = pageStates[i];
        if(!st || st.rendered) return;
        const page = await pdf.getPage(i);
        const vp = page.getViewport({scale});
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        canvas.style.width = Math.round(vp.width) + 'px';
        canvas.style.height = Math.round(vp.height) + 'px';
        const ctx = canvas.getContext('2d');
        await page.render({canvasContext:ctx, viewport:vp}).promise;
        st.placeholder.innerHTML = '';
        st.placeholder.style.minHeight = '';
        st.placeholder.appendChild(canvas);
        st.rendered = true;
        st.canvas = canvas;
      };

      // intersection observer to lazy-render visible pages and update current page
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(en=>{
          const pg = parseInt(en.target.dataset.page,10);
          if(en.isIntersecting){
            renderPage(pg);
            // update current page to the first visible
            currentPage = pg;
            pageIndicator.textContent = `${currentPage} / ${pdf.numPages}`;
          }
        });
      },{root:pagesWrap,threshold:0.4});

      // observe placeholders
      for(let i=1;i<=pdf.numPages;i++) io.observe(pageStates[i].placeholder);

      // dropdown toggle
      fileMore.addEventListener('click', (e)=>{
        e.stopPropagation();
        const shown = fileMenu.style.display === 'block';
        fileMenu.style.display = shown ? 'none' : 'block';
      });
      document.addEventListener('click', ()=>{ fileMenu.style.display = 'none'; });

      // tab switching
      tabHome.addEventListener('click', ()=>{ tabHome.classList.add('active'); tabView.classList.remove('active'); fileGroup.style.display='flex'; navGroup.style.display='flex'; viewGroup.style.display='none'; actionGroup.style.display='flex'; });
      tabView.addEventListener('click', ()=>{ tabView.classList.add('active'); tabHome.classList.remove('active'); fileGroup.style.display='none'; navGroup.style.display='none'; viewGroup.style.display='flex'; actionGroup.style.display='flex'; });

      // configure page input
      pageIndicator.max = pdf.numPages;
      pageIndicator.value = '1';

      // configure page input
      pageIndicator.max = pdf.numPages;
      pageIndicator.value = '1';

      const scrollToPage = (n)=>{
        const st = pageStates[n];
        if(!st) return;
        st.placeholder.scrollIntoView({behavior:'smooth',block:'center'});
      };

        prevBtn.addEventListener('click', ()=>{ if(currentPage>1) scrollToPage(currentPage-1); });
        nextBtn.addEventListener('click', ()=>{ if(currentPage<pdf.numPages) scrollToPage(currentPage+1); });
        pageIndicator.addEventListener('change', ()=>{ let v = parseInt(pageIndicator.value,10) || 1; v = Math.max(1, Math.min(pdf.numPages, v)); pageIndicator.value = v; scrollToPage(v); });

        zoomIn.addEventListener('click', async ()=>{ scale = Math.round((scale + 0.2)*100)/100; zoomLabel.textContent = Math.round(scale*100) + '%'; await reflowPages(); });
        zoomOut.addEventListener('click', async ()=>{ scale = Math.max(0.25, Math.round((scale - 0.2)*100)/100); zoomLabel.textContent = Math.round(scale*100) + '%'; await reflowPages(); });

      downloadBtn.addEventListener('click', ()=>{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
      });
      printBtn.addEventListener('click', ()=>{
        const url = URL.createObjectURL(blob);
        const w = window.open(url);
        const to = setInterval(()=>{ try{ if(w && w.document && w.document.readyState==='complete'){ w.print(); clearInterval(to);} }catch(e){} },250);
      });
      closeBtn.addEventListener('click', ()=>{ io.disconnect(); container.remove(); try{ pdf.destroy && pdf.destroy(); }catch(e){} });

      // Re-render pages at new scale: clear rendered flags and placeholders sizes
      const reflowPages = async ()=>{
        // clear canvases
        for(let i=1;i<=pdf.numPages;i++){
          const st = pageStates[i];
          if(st){ st.rendered = false; st.canvas = null; st.placeholder.innerHTML = ''; st.placeholder.style.minHeight = '80px'; }
        }
        // re-observe (disconnect/reconnect) to retrigger rendering
        io.disconnect();
        for(let i=1;i<=pdf.numPages;i++) io.observe(pageStates[i].placeholder);
        // attempt to render currently visible pages
        // small delay to allow layout
        setTimeout(()=>{
          // find visible ones and render
          pageStates.forEach((st,idx)=>{ if(idx>0) renderPage(idx); });
        },120);
      };

      return container;
    }
  }

  if(!customElements.get('pdf-sign-viewer')) customElements.define('pdf-sign-viewer', PDFSignViewer);

  window.PDFSignSDK = {
    create(opts){
      const el = document.createElement('pdf-sign-viewer');
      if(opts && opts.src) el.load(opts.src);
      if(opts && opts.height) el.style.height = opts.height;
      return el;
    }
  };

})();
