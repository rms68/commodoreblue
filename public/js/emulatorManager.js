// emulatorManager.js - Consolidated C64 emulator management
// Handles all emulator functionality including vice.js integration

(function() {
  // Configuration
  const EMULATOR_CONFIG = {
    vicePath: '/c64/index.html',
    viceJsPath: '/c64/js/x64.js',
    defaultPrgPath: '/basic_programs/',
    panel: {
      width: 800,
      height: 600,
      top: 100,
      right: 20
    }
  };

  // State
  let emulatorPanel = null;
  let currentEmulatorIframe = null;
  let isEmulatorRunning = false;

  /**
   * Initialize the emulator manager
   */
  function init() {
    console.log('EmulatorManager initialized');
    
    // Listen for window close/unload to clean up
    window.addEventListener('beforeunload', () => {
      if (emulatorPanel) {
        closeEmulator();
      }
    });
  }

  /**
   * Launch a program in the emulator
   * @param {Object} program - Program object with file information
   * @param {HTMLElement} container - Optional container to launch emulator in
   */
  function launchProgram(program, container) {
    if (!program) {
      if (window.displayManager) {
        displayManager.writeLine("NO PROGRAM SPECIFIED");
      }
      return;
    }

    console.log('Launching program:', program);

    // Get file URL - ONLY from filename field
    const fileUrl = getFileUrl(program);
    if (!fileUrl) {
      if (window.displayManager) {
        displayManager.writeLine("NO FILE FOUND FOR: " + (program.name || 'UNKNOWN'));
      }
      return;
    }

    // Close any existing emulator
    if (isEmulatorRunning) {
      closeEmulator();
    }

    if (container) {
      // Launch in provided container (from uiManager gaming window)
      loadProgramInContainer(fileUrl, program, container);
    } else {
      // Create our own panel (original behavior)
      createEmulatorPanel();
      loadProgramInEmulator(fileUrl, program);
    }
  }

  /**
   * Get the executable file URL from program object
   * ONLY uses the filename field - no fallbacks, no checking other fields
   */
  function getFileUrl(program) {
    // ONLY use the filename field - ignore everything else
    if (program.filename) {
      const fullPath = EMULATOR_CONFIG.defaultPrgPath + program.filename;
      console.log('File URL generated:', fullPath);
      return fullPath;
    }
    console.error('No filename found in program object:', program);
    return null;
  }

  /**
   * Load program in a provided container (for gaming windows)
   */
  function loadProgramInContainer(fileUrl, program, container) {
    if (!container) return;
    
    console.log('=== LOADING PROGRAM ===');
    console.log('Program name:', program.name);
    console.log('Program filename:', program.filename);
    console.log('Constructed file URL:', fileUrl);
    
    // Clear any existing content in the container first
    container.innerHTML = '';
    
    // First, let's check if the file is accessible
    console.log('Checking if file exists at:', fileUrl);
    
    fetch(fileUrl, { method: 'HEAD' })
        .then(response => {
            console.log('File check response:', response.status);
            if (!response.ok) {
                throw new Error('File returned status: ' + response.status);
            }
            
            // File exists, now create the iframe
            const ext = fileUrl.split('.').pop().toLowerCase();
            const emulatorUrl = new URL(EMULATOR_CONFIG.vicePath, window.location.origin);
            emulatorUrl.searchParams.set('file', fileUrl);
            emulatorUrl.searchParams.set('type', ext);
            emulatorUrl.searchParams.set('name', program.name || 'Program');
            emulatorUrl.searchParams.set('autostart', 'true');
            
            console.log('Loading emulator with URL:', emulatorUrl.toString());
            
            // Create iframe in the container
            const iframe = document.createElement('iframe');
            iframe.src = emulatorUrl.toString();
            iframe.style.width = '750px';
            iframe.style.height = '500px';
            iframe.style.border = 'none';
            iframe.style.background = '#000';
            iframe.setAttribute('allow', 'autoplay; fullscreen');
            iframe.setAttribute('tabindex', '0'); // Make it focusable
            
            container.appendChild(iframe);
            
            currentEmulatorIframe = iframe;
            isEmulatorRunning = true;
            
            // Handle load events
            iframe.onload = () => {
                console.log('✓ Emulator iframe loaded successfully');
                
                // Auto-focus the emulator after loading
                setTimeout(() => {
                    // Focus the iframe
                    iframe.focus();
                    
                    // Try to focus the canvas inside the iframe (if accessible)
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const canvas = iframeDoc.getElementById('canvas');
                        if (canvas) {
                            canvas.focus();
                            console.log('✓ Emulator canvas focused');
                        }
                    } catch (e) {
                        // Cross-origin restrictions might prevent this
                        console.log('Could not access iframe content (cross-origin)');
                    }
                    
                    // Focus the iframe window
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                    }
                    
                    // Dispatch a click event to activate it
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    iframe.dispatchEvent(clickEvent);
                    
                    console.log('✓ Emulator focused and ready for input');
                    
                }, 500); // Wait 500ms for emulator to fully initialize
                
                if (window.displayManager) {
                    displayManager.writeLine('EMULATOR STARTED: ' + (program.name || 'PROGRAM').toUpperCase());
                }
            };
            
            iframe.onerror = (e) => {
                console.error('✗ Emulator iframe error:', e);
                container.innerHTML = '<div style="color: #FF7777; padding: 20px;">ERROR LOADING EMULATOR</div>';
            };
        })
        .catch(error => {
            console.error('✗ File check failed:', error);
            container.innerHTML = '<div style="color: #FF7777; padding: 20px;">FILE ERROR: ' + error.message + '</div>';
        });
  }

  /**
   * Create the emulator panel UI
   */
  function createEmulatorPanel() {
    if (emulatorPanel) return;

    const panel = document.createElement('div');
    panel.id = 'c64-emulator-panel';
    panel.style.cssText = `
      position: fixed;
      top: ${EMULATOR_CONFIG.panel.top}px;
      right: ${EMULATOR_CONFIG.panel.right}px;
      width: ${EMULATOR_CONFIG.panel.width}px;
      height: ${EMULATOR_CONFIG.panel.height}px;
      background: #000;
      border: 2px solid #50ff50;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      box-shadow: 0 4px 20px rgba(80, 255, 80, 0.3);
    `;
    
    panel.innerHTML = `
      <div class="emulator-header" style="
        background: #4040a0;
        color: #fff;
        padding: 10px;
        display: flex;
        align-items: center;
        cursor: move;
        font-family: 'C64', monospace;
        user-select: none;
      ">
        <span style="flex: 1;">VICE.JS C64 EMULATOR</span>
        <button onclick="emulatorManager.toggleFullscreen()" style="
          margin-right: 10px;
          background: #7878c8;
          color: #fff;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          font-family: 'C64', monospace;
        ">⛶</button>
        <button onclick="emulatorManager.closeEmulator()" style="
          background: #ff7777;
          color: #fff;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          font-family: 'C64', monospace;
        ">×</button>
      </div>
      <div class="emulator-body" style="
        flex: 1;
        overflow: hidden;
        background: #000;
        position: relative;
      ">
        <div id="emulator-loading" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #50ff50;
          font-family: 'C64', monospace;
          text-align: center;
          z-index: 1;
        ">
          LOADING VICE.JS...<br>
          <span style="font-size: 12px;">PLEASE WAIT</span>
        </div>
        <iframe id="emulatorIframe" 
                src="" 
                frameborder="0" 
                style="width: 100%; height: 100%; display: none;"
                allow="autoplay; fullscreen"
                tabindex="0">
        </iframe>
      </div>
    `;

    // Make panel draggable
    makeDraggable(panel);

    document.body.appendChild(panel);
    emulatorPanel = panel;
    
    // Animate in
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });
  }

  /**
   * Make panel draggable by its header
   */
  function makeDraggable(panel) {
    const header = panel.querySelector('.emulator-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      if (e.target.tagName === 'BUTTON') return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    }

    function drag(e) {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;

      panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      panel.style.right = 'auto';
      panel.style.top = EMULATOR_CONFIG.panel.top + 'px';
    }

    function dragEnd() {
      isDragging = false;
    }
  }

  /**
   * Load program in the emulator iframe
   */
  function loadProgramInEmulator(fileUrl, program) {
    const iframe = emulatorPanel.querySelector('#emulatorIframe');
    const loadingDiv = emulatorPanel.querySelector('#emulator-loading');
    
    if (!iframe) return;

    // Prepare emulator URL with parameters
    const ext = fileUrl.split('.').pop().toLowerCase();
    const emulatorUrl = new URL(EMULATOR_CONFIG.vicePath, window.location.origin);
    emulatorUrl.searchParams.set('file', fileUrl);
    emulatorUrl.searchParams.set('type', ext);
    emulatorUrl.searchParams.set('name', program.name || 'Program');
    emulatorUrl.searchParams.set('autostart', 'true');

    console.log('Loading emulator with URL:', emulatorUrl.toString());

    // Set iframe source
    iframe.src = emulatorUrl.toString();
    currentEmulatorIframe = iframe;
    isEmulatorRunning = true;

    // Handle load events
    iframe.onload = () => {
      console.log('Emulator iframe loaded');
      setTimeout(() => {
        loadingDiv.style.display = 'none';
        iframe.style.display = 'block';
        
        // Auto-focus the emulator
        iframe.focus();
        
        // Try to focus the canvas inside
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const canvas = iframeDoc.getElementById('canvas');
          if (canvas) {
            canvas.focus();
          }
        } catch (e) {
          console.log('Could not access iframe content');
        }
        
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
        }
        
        console.log('✓ Emulator focused and ready');
      }, 1000);
      
      if (window.displayManager) {
        displayManager.writeLine('EMULATOR STARTED: ' + (program.name || 'PROGRAM').toUpperCase());
      }
    };

    iframe.onerror = (e) => {
      console.error('Emulator load error:', e);
      loadingDiv.innerHTML = 'ERROR LOADING EMULATOR<br><span style="color: #ff7777;">CHECK CONSOLE</span>';
      if (window.displayManager) {
        displayManager.writeLine('ERROR: EMULATOR FAILED TO LOAD');
      }
    };
  }

  /**
   * Close the emulator
   */
  function closeEmulator() {
    if (currentEmulatorIframe) {
      currentEmulatorIframe.src = 'about:blank';
      currentEmulatorIframe = null;
    }

    if (emulatorPanel) {
      emulatorPanel.style.opacity = '0';
      emulatorPanel.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        if (emulatorPanel) {
          emulatorPanel.remove();
          emulatorPanel = null;
        }
      }, 300);
    }

    isEmulatorRunning = false;

    if (window.displayManager) {
      displayManager.writeLine("EMULATOR CLOSED");
    }
  }

  /**
   * Toggle fullscreen for the emulator
   */
  function toggleFullscreen() {
    if (currentEmulatorIframe) {
      if (currentEmulatorIframe.requestFullscreen) {
        currentEmulatorIframe.requestFullscreen();
      } else if (currentEmulatorIframe.webkitRequestFullscreen) {
        currentEmulatorIframe.webkitRequestFullscreen();
      } else if (currentEmulatorIframe.msRequestFullscreen) {
        currentEmulatorIframe.msRequestFullscreen();
      }
    }
  }

  /**
   * Launch by name or index (for command integration)
   */
  function launchByName(target) {
    if (!target) {
      if (window.displayManager) {
        displayManager.writeLine("SYNTAX: PLAY <PROGRAM NAME OR NUMBER>");
      }
      return;
    }

    // Get current programs list from viewRenderer
    const currentResults = window.viewRenderer ? viewRenderer.getCurrentResults() : [];
    const currentContext = window.viewRenderer ? viewRenderer.getCurrentContext() : '';

    if (currentContext !== 'programs') {
      if (window.displayManager) {
        displayManager.writeLine("PLAY COMMAND ONLY WORKS IN PROGRAMS CONTEXT");
        displayManager.writeLine("USE: LOAD BAS-PLAY");
      }
      return;
    }

    // Try to find by index
    const index = parseInt(target);
    if (!isNaN(index) && index > 0 && index <= currentResults.length) {
      launchProgram(currentResults[index - 1]);
      return;
    }

    // Try to find by name
    const lowerTarget = target.toLowerCase();
    const program = currentResults.find(p => 
      (p.name || '').toLowerCase() === lowerTarget ||
      (p.name || '').toLowerCase().includes(lowerTarget)
    );

    if (program) {
      launchProgram(program);
    } else {
      if (window.displayManager) {
        displayManager.writeLine("PROGRAM NOT FOUND: " + target.toUpperCase());
      }
    }
  }

  /**
   * Check if emulator is running
   */
  function isRunning() {
    return isEmulatorRunning;
  }

  // Public API
  window.emulatorManager = {
    init,
    launchProgram,
    launchByName,
    closeEmulator,
    toggleFullscreen,
    isRunning,
    getFileUrl,
    // Aliases for compatibility
    launchGame: launchProgram,
    closeGame: closeEmulator,
    isGameRunning: isRunning
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  console.log('EmulatorManager loaded and initialized');
})();