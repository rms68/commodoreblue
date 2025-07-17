// public/js/uiManager.js - Simplified version with all UI logic
// This file manages all user interface rendering and interactions

(function() {
  'use strict';
  
  console.log('uiManager.js: Starting initialization...');
  
  try {
    // ============================================
    // CONFIGURATION SECTION
    // ============================================
    // All configurable values in one place for easy modification
    const CONFIG = {
      viewMode: 'list',              // Default view: 'list' or 'grid'
      itemsPerPage: 10,              // How many items to show per page
      truncateLength: 80,            // Default text truncation length
      programTruncateLength: 50,     // Truncation for program descriptions in grid
      gamingWindowTruncateLength: 300 // Truncation for gaming window descriptions
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    // These variables track the current state of the UI
    let currentPage = 1;                    // Current pagination page
    const PROMPT_SYMBOL = '> ';             // C64-style command prompt
    const IMAGE_VERSION = '1.0.3';          // For cache-busting images
    let screenLines = [];                   // Array of lines displayed on screen
    let currentLine = '';                   // Current command being typed
    let c64Output = null;                   // Reference to main output div
    let devConsoleEl = null;                // Reference to dev console (if exists)
    let devLogLines = [];                   // Dev console log lines
    let currentContext = 'products';        // What type of items we're viewing
    let currentResults = [];                // Array of current items being displayed
    let currentBreadcrumbs = [];            // Navigation breadcrumbs
    let currentSort = null;                 // Current sort order
    let currentSearchKeyword = '';          // Current search term
    let currentSearchFilters = {};          // Current filter settings
    let activeDetailPanels = [];            // Array of open detail panels
    let activeGamingWindows = [];           // Array of open gaming windows

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    /**
     * Truncates text to specified length, breaking at word boundaries
     * @param {string} text - Text to truncate
     * @param {number} maxChars - Maximum character length
     * @returns {string} Truncated text with ellipsis if needed
     */
    function truncateDescription(text, maxChars) {
      const finalMaxChars = maxChars || CONFIG.truncateLength;
      if (!text || text.length <= finalMaxChars) return text || '';
      const truncated = text.substring(0, finalMaxChars);
      const lastSpace = truncated.lastIndexOf(' ');
      return truncated.substring(0, lastSpace) + '...';
    }

    /**
     * Gets a slice of items for the current page
     * @param {Array} items - All items
     * @param {number} page - Page number (1-based)
     * @returns {Array} Items for the current page
     */
    function getPaginatedItems(items, page = 1) {
      const start = (page - 1) * CONFIG.itemsPerPage;
      return items.slice(start, start + CONFIG.itemsPerPage);
    }

    /**
     * Generates HTML for pagination controls
     * @param {number} totalItems - Total number of items
     * @param {number} page - Current page number
     * @returns {string} HTML string for pagination
     */
    function getPaginationHTML(totalItems, page) {
      const totalPages = Math.ceil(totalItems / CONFIG.itemsPerPage);
      if (totalPages <= 1) return '';
      
      let html = '<div class="pagination">';
      
      // Previous page link
      if (page > 1) {
        html += `<a href="#" onclick="window.changePage(${page - 1});return false;"><</a>`;
      }
      
      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        if (i === page) {
          // Current page (no link, just highlighted)
          html += `<span class="current-page">${i}</span>`;
        } else {
          // Other pages (clickable links)
          html += `<a href="#" onclick="window.changePage(${i});return false;">${i}</a>`;
        }
      }
      
      // Next page link
      if (page < totalPages) {
        html += `<a href="#" onclick="window.changePage(${page + 1});return false;">></a>`;
      }
      
      html += '</div>';
      return html;
    }

    /**
     * Gets the URL for a collection/category image
     * @param {Object|string} col - Collection object or name
     * @returns {string} Image URL
     */
    function getCollectionImageUrl(col) {
      const v = '?v=' + IMAGE_VERSION;
      const name = (col && col.name) ? col.name.toUpperCase() : (typeof col === 'string' ? col.toUpperCase() : 'DEFAULT');
      return `/images_products/${name}.png${v}`;
    }

    /**
     * Gets the rollover image URL for a collection
     * @param {Object|string} col - Collection object or name
     * @returns {string} Rollover image URL
     */
    function getCollectionRolloverImageUrl(col) {
      const v = '?v=' + IMAGE_VERSION;
      const name = (col && col.name) ? col.name.toUpperCase() : (typeof col === 'string' ? col.toUpperCase() : 'DEFAULT_ROLL');
      return `/images_products/${name}_ROLL.png${v}`;
    }

    /**
     * Gets the image URL for a product, with fallback to generated image
     * @param {Object} product - Product object
     * @returns {string} Image URL
     */
    function getImageUrl(product) {
      return (product && product.image_url) ? product.image_url
           : generateProductImage(product?.name, '#4040a0');
    }

    /**
     * Generates a placeholder SVG image for products without images
     * @param {string} name - Product name
     * @param {string} color - Background color
     * @returns {string} Data URL for SVG image
     */
    function generateProductImage(name = 'Product', color = '#4040a0') {
      const enc = encodeURIComponent(name);
      return `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='${encodeURIComponent(color)}' width='200' height='200'/%3E%3Ctext fill='%23fff' font-family='sans-serif' font-size='18' x='100' y='100' text-anchor='middle'%3E${enc}%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Generates a C64-style program image
     * @param {string} name - Program name
     * @param {string} type - Program type (BASIC, PRG, etc.)
     * @returns {string} Data URL for SVG image
     */
    function generateProgramImage(name = 'Program', type = 'BASIC') {
      const n = encodeURIComponent(name);
      const t = encodeURIComponent(type);
      return `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%234040a0' width='200' height='200'/%3E%3Ctext fill='%2350ff50' font-family='monospace' font-size='24' x='100' y='60' text-anchor='middle'%3E${t}%3C/text%3E%3Ctext fill='%23ffffff' font-family='monospace' font-size='16' x='100' y='100' text-anchor='middle'%3E${n}%3C/text%3E%3Ctext fill='%237878c8' font-family='monospace' font-size='14' x='100' y='140' text-anchor='middle'%3ELOAD%20%22${n}%22%3C/text%3E%3Ctext fill='%237878c8' font-family='monospace' font-size='14' x='100' y='160' text-anchor='middle'%3ERUN%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Handles collection image load errors by using default image
     * @param {HTMLImageElement} img - Image element that failed to load
     */
    function handleCollectionImageError(img) {
      img.src = '/images_products/DEFAULT.png';
      img.onerror = null; // Prevent infinite error loop
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * Initializes the UI manager with the output element
     * @param {HTMLElement} outputEl - The main output div element
     */
    function init(outputEl) {
      console.log('uiManager: init called');
      c64Output = outputEl;
      devConsoleEl = document.getElementById('devConsole');
      
      // Try to restore view mode from session storage
      try {
        const mode = sessionStorage.getItem('viewMode');
        if (mode === 'list' || mode === 'grid') CONFIG.viewMode = mode;
      } catch (e) {
        console.error('uiManager: sessionStorage error', e);
      }
    }

    // ============================================
    // DEV CONSOLE FUNCTIONS
    // ============================================
    
    /**
     * Logs a message to the dev console (if it exists)
     * @param {string} msg - Message to log
     */
    function devLog(msg) {
      if (!devConsoleEl) return;
      devLogLines.push(msg);
      if (devLogLines.length > 4) devLogLines.shift(); // Keep only last 4 lines
      devConsoleEl.innerHTML = devLogLines.join('<br>');
    }

    /**
     * Toggles dev console visibility
     * @param {boolean} show - Optional: force show/hide
     */
    function toggleDevConsole(show) {
      if (!devConsoleEl) return;
      devConsoleEl.style.display = (show === undefined)
        ? (devConsoleEl.style.display === 'none' ? 'block' : 'none')
        : (show ? 'block' : 'none');
    }

    // ============================================
    // SCREEN OUTPUT FUNCTIONS
    // ============================================
    
    /**
     * Writes a line of text to the screen
     * @param {string} text - Text to write (can include newlines)
     */
    function writeLine(text = '') {
      text.split('\n').forEach(line => screenLines.push({ type: 'text', content: line }));
      renderScreen();
    }

    /**
     * Writes HTML content to the screen
     * @param {string} html - HTML to write
     */
    function writeHTML(html) {
      screenLines.push({ type: 'html', content: html });
      renderScreen();
    }

    /**
     * Renders all screen content including the command prompt
     */
    function renderScreen() {
      if (!c64Output) return;
      
      // Remove existing prompt line if any
      const prevPrompt = c64Output.querySelector('[data-prompt-line]');
      if (prevPrompt) {
        const br = prevPrompt.previousSibling;
        if (br && br.nodeName === 'BR') br.remove();
        prevPrompt.remove();
      }
      
      // Build HTML from screen lines
      const html = screenLines.map(l => l.type === 'html'
        ? l.content
        : l.content.replace(/</g, '<').replace(/>/g, '>') // Escape HTML in text
      ).join('<br>');
      
      // Set content
      c64Output.innerHTML = html;
      
      // Add line break before prompt if there's content
      if (html) c64Output.appendChild(document.createElement('br'));
      
      // Add command prompt
      const promptEl = document.createElement('span');
      promptEl.setAttribute('data-prompt-line', '');
      promptEl.textContent = PROMPT_SYMBOL + currentLine;
      c64Output.appendChild(promptEl);
      
      // Scroll to bottom
      c64Output.scrollTop = c64Output.scrollHeight;
      
      // Set up grid event handlers if in grid mode
      if (CONFIG.viewMode === 'grid') setTimeout(setupGridEventHandlers, 10);
    }
    
    /**
     * Updates just the prompt line (more efficient for typing)
     */
    function updatePromptLineOnly() {
      if (!c64Output) return;
      let promptEl = c64Output.querySelector('[data-prompt-line]');
      if (!promptEl) {
        if (c64Output.lastChild) c64Output.appendChild(document.createElement('br'));
        promptEl = document.createElement('span');
        promptEl.setAttribute('data-prompt-line', '');
        c64Output.appendChild(promptEl);
      }
      promptEl.textContent = PROMPT_SYMBOL + currentLine;
      c64Output.scrollTop = c64Output.scrollHeight;
    }

    /**
     * Clears the current command line
     */
    function newLine() {
      currentLine = '';
      renderScreen();
    }

    /**
     * Updates the screen with new result set (categories, products, etc.)
     * FIXED: Properly handles mixed text and HTML content
     * @param {string|Array} output - Content to display
     */
    function updateResultSet(output) {
      screenLines = [];
      
      // Add breadcrumbs if any
      if (currentBreadcrumbs.length) {
        const bcHtml = currentBreadcrumbs.map(bc =>
          bc.type === 'link'
            ? `<a href='#' onclick="commandManager.runCommand('${bc.action}${bc.param ? ' ' + bc.param : ''}');return false;">${bc.label}</a>`
            : bc.label
        ).join(' > ');
        screenLines.push({ type: 'html', content: `<div class="breadcrumbs">Location: ${bcHtml}</div>` });
      }
      
      // Add the output - FIXED to handle mixed content properly
      if (typeof output === 'string') {
        screenLines.push({ type: /<[^>]+>/.test(output) ? 'html' : 'text', content: output });
      } else if (Array.isArray(output)) {
        output.forEach(line => {
          // Handle different line formats
          if (typeof line === 'object' && line.type) {
            // Line already has type specified (like {type: 'html', content: '...'})
            screenLines.push(line);
          } else if (typeof line === 'object' && line.content) {
            // Line has content property but no type
            const content = line.content;
            screenLines.push({ type: /<[^>]+>/.test(content) ? 'html' : 'text', content: content });
          } else {
            // Plain string
            const str = String(line);
            screenLines.push({ type: /<[^>]+>/.test(str) ? 'html' : 'text', content: str });
          }
        });
      }
    }

    // ============================================
    // PAGINATION FUNCTIONS
    // ============================================
    
    /**
     * Changes to a different page of results
     * @param {number} page - Page number to change to
     */
    function changePage(page) {
      currentPage = page;
      const ctx = currentContext;
      
      // Call the appropriate render function based on context
      const fn = ctx === 'categories' ? renderCategoriesView
               : ctx === 'programs'   ? renderProgramsView
               : renderProductsView;
      
      fn(currentResults);
      renderScreen();
    }

    /**
     * Toggles between list and grid view
     */
    function toggleView() {
      CONFIG.viewMode = (CONFIG.viewMode === 'list' ? 'grid' : 'list');
      
      // Save preference
      try { sessionStorage.setItem('viewMode', CONFIG.viewMode); } catch (e) {}
      
      // Re-render current view
      (currentContext === 'categories' ? renderCategoriesView
        : currentContext === 'programs' ? renderProgramsView
        : renderProductsView)(currentResults);
      renderScreen();
    }

    // ============================================
    // GRID EVENT HANDLERS
    // ============================================
    
    /**
     * Sets up mouse event handlers for grid items (rollover effects)
     */
    function setupGridEventHandlers() {
      document.querySelectorAll('.collection-image').forEach(img => {
        const normal = img.dataset.normal;
        const roll = img.dataset.rollover;
        const pre = new Image(); 
        let ready = false;
        
        // Preload rollover image
        pre.src = roll;
        pre.onload = () => { ready = true; };
        
        // Mouse events
        img.onmouseenter = () => { if (ready) img.src = roll; };
        img.onmouseleave = () => { img.src = normal; };
        img.onerror = () => handleCollectionImageError(img);
      });
    }

    // ============================================
    // CATEGORY RENDERING
    // ============================================
    
    /**
     * Main function to render categories in current view mode
     * @param {Array} categories - Array of category objects
     */
    function renderCategoriesView(categories) { 
      updateResultSet(
        CONFIG.viewMode === 'list' ? renderCategoriesInListView(categories) : renderCategoriesInGridView(categories)
      ); 
    }

    /**
     * Renders categories as a C64-style text list
     * @param {Array} categories - Array of category objects
     * @returns {Array} Array of text lines to display
     */
    function renderCategoriesInListView(categories) {
      const out = ['<span class="directory-title">"CATEGORIES DIRECTORY"       QTY</span>',''];
      const list = getPaginatedItems(categories, currentPage);
      const start = (currentPage - 1) * CONFIG.itemsPerPage;
      
      list.forEach((cat,i) => {
        const idx = String(start+i+1).padStart(3,' ');        // Right-align index
        const name = (cat.name||'UNNAMED').toUpperCase();
        const cnt  = cat.count||0;
        out.push(`${idx}  <a href='#' onclick="commandManager.runCommand('load ${encodeURIComponent(cat.name)}');return false;">"${name}"</a> ${cnt}`);
      });
      
      out.push('','', getPaginationHTML(categories.length, currentPage),'','<span class="blocks-free">525 BLOCKS FREE.</span>');
      return out;
    }

    /**
     * Renders categories as a visual grid with images
     * @param {Array} categories - Array of category objects
     * @returns {Array} Array containing HTML for grid display
     */
    function renderCategoriesInGridView(categories) {
      let html = '<div class="grid-container-wrapper"><div class="simple-grid">';
      
      getPaginatedItems(categories, currentPage).forEach(cat => {
        const name = (cat.name || 'UNNAMED').toUpperCase();
        const id = encodeURIComponent(name);
        const norm = getCollectionImageUrl(cat);
        const roll = getCollectionRolloverImageUrl(cat);
        
        html += `<div class="grid-item category-item" onclick="commandManager.runCommand('load ${id}');">` +
          `<img src="${norm}" data-normal="${norm}" data-rollover="${roll}" class="collection-image">` +
          `</div>`;
      });
      
      html += '</div></div>' + getPaginationHTML(categories.length, currentPage) + '<div class="blocks-free-grid">525 BLOCKS FREE.</div>';
      return [html];
    }

    // ============================================
    // PRODUCT RENDERING
    // ============================================
    
    /**
     * Main function to render products in current view mode
     * @param {Array} items - Array of product objects
     */
    function renderProductsView(items) { 
      updateResultSet(
        CONFIG.viewMode === 'list' ? renderProductsInListView(items) : renderProductsInGridView(items)
      ); 
    }

    /**
     * Renders products as a C64-style text list
     * @param {Array} items - Array of product objects
     * @returns {Array} Array of text lines to display
     */
    function renderProductsInListView(items) {
      if (!items?.length) return ['No products found.'];
      
      const out = ['<span class="directory-title">"PRODUCT DIRECTORY"         PRICE</span>',''];
      const page = getPaginatedItems(items, currentPage);
      const start = (currentPage - 1) * CONFIG.itemsPerPage;
      
      page.forEach((p,i) => {
        const idx = String(start+i+1).padStart(3,' ');
        const name = (p.name||'UNNAMED').toUpperCase();
        const price = '$'+(p.price||0).toFixed(2);
        out.push(`${idx}  <a href='#' onclick="viewRenderer.openDetailByIndex(${start+i});return false;">"${name}"</a> ${price}`);
      });
      
      out.push('','', getPaginationHTML(items.length, currentPage),'','<span class="blocks-free">525 BLOCKS FREE.</span>','READY.');
      return out;
    }

    /**
     * Renders products as a visual grid with images
     * FIXED: Now includes "FOUND X PRODUCTS" message and returns mixed content array
     * @param {Array} items - Array of product objects
     * @returns {Array} Array containing HTML for grid display
     */
    function renderProductsInGridView(items) {
      if (!items?.length) return ['No products found.'];
      
      // FIXED: Build array with text and HTML objects
      let output = [];
      
      // Add the product count message
      output.push('');  // Empty line for spacing
      output.push(`FOUND ${items.length} PRODUCTS.`);
      output.push('');  // Empty line for spacing
      
      // Build the grid HTML
      let html = '<div class="grid-container-wrapper"><div class="simple-grid">';
      
      getPaginatedItems(items, currentPage).forEach((p, i) => {
        const idx = (currentPage - 1) * CONFIG.itemsPerPage + i;
        const img = p.image_url || p.files?.[0] || generateProductImage(p.name);
        const name = p.name || 'Product';
        const desc = truncateDescription(p.description, CONFIG.truncateLength);
        const price = '$' + (p.price || 0).toFixed(2);
        
        // Uses same structure as programs - square grid items with overlay
        html += `
          <div class="grid-item" onclick="viewRenderer.openDetailByIndex(${idx});">
            <img src="${img}" class="product-image">
            <div class="product-name">${name}</div>
            <div class="product-price">${price}</div>
            <div class="product-mini-desc">${desc}</div>
          </div>`;
      });
      
      html += '</div></div>' + getPaginationHTML(items.length, currentPage);
      
      // Add HTML as object with type
      output.push({ type: 'html', content: html });
      
      // Add footer text
      output.push('');
      output.push('<span class="blocks-free">525 BLOCKS FREE.</span>');
      output.push('READY.');
      
      return output;
    }

    // ============================================
    // PROGRAM RENDERING
    // ============================================
    
    /**
     * Main function to render programs in current view mode
     * @param {Array} ps - Array of program objects
     */
    function renderProgramsView(ps) { 
      updateResultSet(
        CONFIG.viewMode ==='list' ? renderProgramsInListView(ps) : renderProgramsInGridView(ps)
      ); 
    }

    /**
     * Renders programs as a C64-style text list
     * @param {Array} ps - Array of program objects
     * @returns {Array} Array of text lines to display
     */
    function renderProgramsInListView(ps) {
      if (!ps?.length) return ['No programs found.'];
      
      const out=['<span class="directory-title">"PROGRAMS DIRECTORY"         TYPE</span>',''];
      const page=getPaginatedItems(ps, currentPage);
      const start=(currentPage - 1) * CONFIG.itemsPerPage;
      
      page.forEach((pr,i)=>{
        const idx=String(start+i+1).padStart(3,' ');
        const name=(pr.name||'UNNAMED').toUpperCase();
        const type=(pr.filetype||'BASIC').toUpperCase();
        out.push(`${idx}  <a href='#' onclick="commandManager.runCommand('load ${start+i+1}');return false;">"${name}"</a> ${type}`);
      });
      
      out.push('','',getPaginationHTML(ps.length,currentPage),'','<span class="blocks-free">525 BLOCKS FREE.</span>','READY.');
      return out;
    }

    /**
     * Renders programs as a visual grid with images
     * @param {Array} ps - Array of program objects
     * @returns {Array} Array containing HTML for grid display
     */
    function renderProgramsInGridView(ps) {
      if (!ps?.length) return ['No programs found.'];
      
      let html = '<div class="grid-container-wrapper"><div class="simple-grid">';
      
      getPaginatedItems(ps, currentPage).forEach((pr, i) => {
        const idx = (currentPage - 1) * CONFIG.itemsPerPage + i;
        const img = pr.image_url || pr.files?.[0] || pr.screenshot || generateProgramImage(pr.name, pr.filetype);
        const name = pr.name || 'Unnamed';
        const type = (pr.filetype || 'BASIC').toUpperCase();
        const desc = truncateDescription(pr.description, CONFIG.programTruncateLength);
        
        html += `
          <div class="grid-item" onclick="commandManager.runCommand('load ${idx + 1}');">
            <img src="${img}" class="program-image">
            <div class="program-name">${name}</div>
            <div class="program-type">${type}</div>
            <div class="program-mini-desc">${desc}</div>
          </div>`;
      });
      
      html += '</div></div>' + getPaginationHTML(ps.length, currentPage) + '<div class="blocks-free-grid">525 BLOCKS FREE.</div><div class="ready-line">READY.</div>';
      return [html];
    }

    // ============================================
    // DETAIL PANEL FUNCTIONS
    // ============================================
    
    /**
     * Opens a sliding detail panel for a product
     * @param {Object} product - Product to display
     */
    function openDetailPanel(product) {
      if (!product) { writeLine('Product not found.'); return; }
      
      // Check if panel already exists for this product
      const existing = activeDetailPanels.find(p=>p.productId===product.id);
      if (existing) { highlightPanel(existing); return; }
      
      // Create new panel
      const panel=document.createElement('div'); 
      panel.className='detail-panel';
      
      // Gather all media files
      const files=product.files||[];
      let media=[...(product.image_url?[product.image_url]:[]),...files];
      if(!media.length) media=[generateProductImage(product.name)];
      
      // Select main media (prefer images over videos)
      const main=media.find(m=>!m.endsWith('.mp4'))||media[0];
      const mainHtml=main.endsWith('.mp4')
        ? `<video controls autoplay muted loop><source src="${main}" type="video/mp4"></video>`
        : `<img src="${main}" />`;
      
      // Generate thumbnails
      let thumbs=''; 
      media.forEach(m=>{
        thumbs+=m.endsWith('.mp4')
          ? `<div class="thumbnail video-thumb" onclick="swapDetailMedia('${m}')"><video muted src="${m}"></video><div class="play-icon">▶</div></div>`
          : `<div class="thumbnail" onclick="swapDetailMedia('${m}')"><img src="${m}"/></div>`;
      });
      
      // Build panel HTML
      panel.innerHTML=`
        <div class="detail-panel-header">
          <button class="close-btn">×</button>
          <span class="detail-panel-title">${product.name}</span>
          <button class="buy-btn snipcart-add-item"
            data-item-id="${product.id}"
            data-item-price="${product.price}"
            data-item-name="${product.name}"
            data-item-image="${product.image_url||''}"
            data-item-url="${window.location.href}">Add to Cart</button>
        </div>
        <div class="detail-panel-body">
          <p>Price: $${(product.price||0).toFixed(2)}</p>
          <p>${product.description||'No description.'}</p>
          <div class="detail-images"><div id="mainMediaContainer">${mainHtml}</div><div class="thumbnail-strip">${thumbs}</div></div>
        </div>`;
      
      // Set up panel object and events
      const panelObj={ element:panel, productId:product.id };
      panel.querySelector('.close-btn').onclick=()=>{ explodePanel(panelObj); };
      
      // Add to DOM and track
      activeDetailPanels.push(panelObj);
      document.body.appendChild(panel);
      
      // Animate in
      setTimeout(()=>panel.classList.add('open'),10);
      
      // Reposition all panels
      reflowDetailPanels();
    }

    /**
     * Shows explosion animation and hides panel
     * @param {Object} pObj - Panel object to explode
     */
    function explodePanel(pObj) { 
      showExplosion(pObj); 
      pObj.element.style.visibility='hidden'; 
      setTimeout(()=>removeDetailPanel(pObj), 600); 
    }
    
    /**
     * Removes detail panel from DOM and tracking
     * @param {Object} pObj - Panel object to remove
     */
    function removeDetailPanel(pObj) {
      const i=activeDetailPanels.indexOf(pObj);
      if(i!==-1) activeDetailPanels.splice(i,1);
      pObj.element.classList.remove('open');
      setTimeout(()=>{ 
        if(document.body.contains(pObj.element)) pObj.element.remove(); 
        reflowDetailPanels(); 
      }, 600);
    }

    /**
     * Repositions all detail panels in a stacked arrangement
     */
    function reflowDetailPanels() {
      activeDetailPanels.forEach((p,i)=>{
        p.element.style.top = (40 + i * 60) + 'px';  // Stack vertically
        p.element.style.zIndex = (1000 + i).toString(); // Layer properly
      });
    }

    /**
     * Highlights a panel temporarily (when clicking duplicate)
     * @param {Object} pObj - Panel object to highlight
     */
    function highlightPanel(pObj) {
      pObj.element.classList.add('highlight');
      setTimeout(()=>pObj.element.classList.remove('highlight'),1500);
    }

    /**
     * Creates explosion animation effect
     * @param {Object} pObj - Panel object to explode
     */
    function showExplosion(pObj) {
      const rect=pObj.element.getBoundingClientRect();
      const cfg={ 
        frames:9,       // Number of animation frames
        dur:80,         // Duration per frame (ms)
        mult:4,         // Size multiplier
        path:'images/explode/BOOM_${index}.png', 
        start:1, 
        end:0.1, 
        dissolve:300 
      };
      
      // Create explosion container
      const container=document.createElement('div');
      container.style.position='fixed';
      const w=rect.width*cfg.mult, h=rect.height*cfg.mult;
      container.style.left=`${rect.left+rect.width/2-w/2}px`;
      container.style.top=`${rect.top- h/2}px`;
      container.style.width=`${w}px`; 
      container.style.height=`${h}px`;
      container.style.zIndex='3000'; 
      container.style.pointerEvents='none';
      document.body.appendChild(container);
      
      // Create frames
      const frames=[];
      for(let i=1;i<=cfg.frames;i++){
        const img=document.createElement('img');
        img.src=cfg.path.replace('${index}',i);
        img.style.position='absolute'; 
        img.style.width='100%'; 
        img.style.height='100%'; 
        img.style.objectFit='contain'; 
        img.style.opacity=0;
        container.appendChild(img); 
        frames.push(img);
      }
      
      // Animate frames
      let f=0;
      const step=()=>{
        frames.forEach(fr=>{ fr.style.opacity=0; });
        if(f>=cfg.frames){ 
          container.style.transition=`opacity ${cfg.dissolve}ms ease-out`; 
          container.style.opacity=0; 
          return setTimeout(()=>container.remove(),cfg.dissolve); 
        }
        frames[f].style.opacity=String((1 - f/(cfg.frames-1))*(1-cfg.end)+cfg.end);
        f++; 
        setTimeout(step,cfg.dur);
      };
      setTimeout(step,50);
    }

    // ============================================
    // GAMING WINDOW FUNCTIONS
    // ============================================
    
    /**
     * Creates a gaming window for programs (with emulator support)
     * @param {Object} pr - Program object
     */
    function renderProgramDetailView(pr) {
      let main = pr.files?.[0] || pr.image_url || generateProgramImage(pr.name, pr.filetype);
      const preview = `<div class="game-preview"><img src="${main}"></div>`;
      
      // Check if window already exists
      const exist = activeGamingWindows.find(w => w.programId === pr.product_id);
      if (exist) { highlightGamingWindow(exist); return; }
      
      // Create new gaming window
      const win = document.createElement('div'); 
      win.className = 'gaming-window'; 
      win.dataset.programId = pr.product_id;
      const descriptionHtml = truncateDescription(pr.description, CONFIG.gamingWindowTruncateLength);
      
      win.innerHTML = `
          <div class="header">🎮 ${pr.name.toUpperCase()}<button class="close-btn">×</button></div>
          <div class="body">${preview}<div class="info"><h3>TYPE: ${pr.filetype.toUpperCase()}</h3><p>${descriptionHtml}</p><button class="play-btn">▶ PLAY</button><button class="stop-btn" style="display:none;">◼ STOP</button></div></div>`;
      
      // Set up window object and events
      const wObj = { element: win, programData: pr, isPlaying: false };
      win.querySelector('.close-btn').onclick = () => closeGamingWindow(wObj);
      win.querySelector('.play-btn').onclick = () => launchGameInWindow(wObj);
      win.querySelector('.stop-btn').onclick = () => stopGameInWindow(wObj);
      
      // Add to DOM and track
      activeGamingWindows.push(wObj);
      document.body.appendChild(win);
      positionGamingWindow(wObj);
      
      // Animate in
      setTimeout(() => win.classList.add('open'), 10);
    }

    /**
     * Launches emulator in the gaming window
     * @param {Object} winObj - Window object
     */
    function launchGameInWindow(winObj) {
      const area=winObj.element.querySelector('.game-preview');
      if(!window.emulatorManager?.launchProgram) { 
        area.innerHTML='<div style="color:#F77;">Emulator not loaded</div>'; 
        return; 
      }
      try{ 
        window.emulatorManager.launchProgram(winObj.programData,area); 
      }catch(e){ 
        area.innerHTML=`<div style="color:#F77;">ERROR: ${e.message}</div>`; 
        return; 
      }
      winObj.isPlaying=true;
      winObj.element.querySelector('.play-btn').style.display='none';
      winObj.element.querySelector('.stop-btn').style.display='inline-block';
    }

    /**
     * Stops emulator and restores preview
     * @param {Object} winObj - Window object
     */
    function stopGameInWindow(winObj) {
      const area=winObj.element.querySelector('.game-preview');
      area.innerHTML=`<img src="${winObj.programData.files?.[0]||winObj.programData.image_url||generateProgramImage(winObj.programData.name)}"/>`;
      winObj.isPlaying=false;
      winObj.element.querySelector('.play-btn').style.display='inline-block';
      winObj.element.querySelector('.stop-btn').style.display='none';
      window.emulatorManager?.closeEmulator();
    }

    /**
     * Highlights existing gaming window
     * @param {Object} winObj - Window object to highlight
     */
    function highlightGamingWindow(winObj) {
      winObj.element.classList.add('highlight');
      setTimeout(()=>winObj.element.classList.remove('highlight'),1500);
    }

    /**
     * Closes and removes gaming window
     * @param {Object} winObj - Window object to close
     */
    function closeGamingWindow(winObj) {
      if(winObj.isPlaying) stopGameInWindow(winObj);
      const idx=activeGamingWindows.indexOf(winObj);
      if(idx!==-1) activeGamingWindows.splice(idx,1);
      winObj.element.classList.remove('open');
      setTimeout(()=>winObj.element.remove(),300);
    }

    /**
     * Positions gaming window with cascading effect
     * @param {Object} winObj - Window object to position
     */
    function positionGamingWindow(winObj) {
      const idx=activeGamingWindows.indexOf(winObj)+1;
      winObj.element.style.position='fixed';
      winObj.element.style.left='50%'; 
      winObj.element.style.top='50%';
      // Cascade windows diagonally
      winObj.element.style.transform=`translate(-50%,-50%) translate(${(idx-1)*30}px,${(idx-1)*30}px)`;
      winObj.element.style.zIndex=(9999+idx).toString();
    }

    /**
     * Swaps main media in detail panel
     * @param {string} url - URL of media to display
     */
    function swapDetailMedia(url) {
      const c=document.getElementById('mainMediaContainer');
      if(!c) return;
      c.innerHTML = url.endsWith('.mp4')
        ? `<video controls autoplay muted loop><source src="${url}" type="video/mp4"></video>`
        : `<img src="${url}"/>`;
    }

    // Legacy function aliases
    function swapDetailImage(url) { swapDetailMedia(url); }
    function forceImageRefresh() { /* No longer needed */ }
    function updateImageVersion(newV) { /* No longer needed */ }
    function updateToggleButton() { /* Stub for compatibility */ }

    // ============================================
    // PUBLIC API EXPORTS
    // ============================================
    
    // Export display manager functions
    window.displayManager = {
      init, devLog, toggleDevConsole,
      writeLine, writeHTML, renderScreen,
      newLine, updateResultSet, toggleView,
      updatePromptLineOnly, updateToggleButton,
      
      // State getters/setters
      getScreenLines:()=>screenLines,
      setScreenLines:lines=>{ screenLines=lines; },
      getCurrentLine:()=>currentLine,
      setCurrentLine:line=>{ currentLine=line; },
      getViewMode:()=>CONFIG.viewMode
    };

    // Export view rendering functions
    window.viewRenderer = {
      renderCategoriesView, renderProductsView, renderProgramsView,
      renderDetailView: openDetailPanel, renderProgramDetailView,
      openStackedDetailPanel: openDetailPanel, removeDetailPanel, reflowDetailPanels,
      
      // State management
      resetPage:()=>{ currentPage=1; },
      updateBreadcrumbs: bc=>{ currentBreadcrumbs=bc; },
      getCurrentBreadcrumbs:()=>currentBreadcrumbs,
      getCurrentResults:()=>currentResults,
      setCurrentResults:rs=>{ currentResults=rs; },
      getCurrentSort:()=>currentSort,
      setCurrentSort:s=>{ currentSort=s; },
      getCurrentContext:()=>currentContext,
      setCurrentContext:c=>{ currentContext=c; },
      getCurrentSearchKeyword:()=>currentSearchKeyword,
      setCurrentSearchKeyword:k=>{ currentSearchKeyword=k; },
      getCurrentSearchFilters:()=>currentSearchFilters,
      setCurrentSearchFilters:f=>{ currentSearchFilters=f; },
      getImageUrl, 
      
      // Helper to open detail by index
      openDetailByIndex: idx => {
        if (currentResults[idx]) openDetailPanel(currentResults[idx]);
      }
    };

    // CLEANUP: Removed the empty gridManager stub as it is no longer used.
    
    // Global utility exports
    window.getCollectionImageUrl = getCollectionImageUrl;
    window.getCollectionRolloverImageUrl = getCollectionRolloverImageUrl;
    window.activeGamingWindows = activeGamingWindows;
    window.uiManager = window.displayManager; // Alias for compatibility
    window.changePage = changePage;
    window.swapDetailMedia = swapDetailMedia;

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() { 
      console.log('uiManager: DOMContentLoaded');
    });
    
    // Wait for Snipcart to be ready
    document.addEventListener('snipcart.ready', function() { 
      console.log('uiManager: Snipcart ready');
    });
    
    console.log('uiManager.js: Initialization complete');
    
  } catch (error) {
    console.error('uiManager.js: Fatal error during initialization:', error);
    console.error('Stack trace:', error.stack);
  }
})();