// ***** START SCOPE: serverArchitecture *****
/**
 * VICE.js Server-Side Streaming Architecture
 * 
 * Core concept: Run VICE.js on server, stream canvas to client,
 * receive input from client and inject into emulator
 */

// ***** START SCOPE: serverCore *****
// server.js - Node.js server running VICE.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createCanvas } = require('canvas');
const fs = require('fs');

class VICEServerInstance {
  constructor(gameId) {
    this.gameId = gameId;
    this.canvas = createCanvas(384, 272); // C64 resolution
    this.ctx = this.canvas.getContext('2d');
    this.frameBuffer = null;
    this.isRunning = false;
    this.inputQueue = [];
    
    // VICE.js module configuration
    this.Module = null;
    this.initializeVICE();
  }
  
  // ***** START SCOPE: viceInitialization *****
  initializeVICE() {
    // Load VICE.js in Node environment
    // We'll need to mock some browser APIs
    global.window = {
      requestAnimationFrame: (cb) => setTimeout(cb, 16), // 60fps
      cancelAnimationFrame: clearTimeout
    };
    
    global.document = {
      getElementById: (id) => {
        if (id === 'canvas') return this.canvas;
        return null;
      },
      createElement: (tag) => {
        if (tag === 'canvas') return this.canvas;
        return {};
      }
    };
    
    // Configure VICE.js Module
    this.Module = {
      canvas: this.canvas,
      preRun: [() => this.mountGame()],
      postRun: [() => this.onVICEReady()],
      
      // Override print functions for server environment
      print: (text) => console.log(`[VICE ${this.gameId}]:`, text),
      printErr: (text) => console.error(`[VICE ${this.gameId}]:`, text),
      
      // Capture screen data instead of rendering to DOM
      onRuntimeInitialized: () => {
        console.log('VICE.js runtime initialized');
      }
    };
    
    // Load VICE.js (you'd need the compiled vice.js file)
    // require('./vice.js')(this.Module);
  }
  // ***** END SCOPE: viceInitialization *****
  
  // ***** START SCOPE: gameLoading *****
  mountGame() {
    // Mount game file in VICE filesystem
    const gameData = fs.readFileSync(`./games/${this.gameId}.prg`);
    this.Module.FS.writeFile('/game.prg', gameData);
  }
  
  onVICEReady() {
    this.isRunning = true;
    console.log(`VICE instance ${this.gameId} ready`);
    
    // Start the frame capture loop
    this.startFrameCapture();
    
    // Start input processing loop
    this.startInputProcessing();
  }
  // ***** END SCOPE: gameLoading *****
  
  // ***** START SCOPE: frameCapture *****
  startFrameCapture() {
    const captureFrame = () => {
      if (!this.isRunning) return;
      
      // Get pixel data from canvas
      const imageData = this.ctx.getImageData(0, 0, 384, 272);
      
      // Convert to more efficient format for streaming
      // Option 1: Raw RGBA (simple but larger)
      // Option 2: PNG encoding (compressed but CPU intensive)
      // Option 3: WebP or custom compression
      
      // For now, let's use raw RGBA with simple compression
      this.frameBuffer = this.compressFrame(imageData.data);
      
      // Schedule next capture
      setTimeout(captureFrame, 33); // ~30fps for streaming
    };
    
    captureFrame();
  }
  
  compressFrame(rgbaData) {
    // Simple RLE compression or delta encoding could go here
    // For MVP, just return the raw data
    return Buffer.from(rgbaData);
  }
  // ***** END SCOPE: frameCapture *****
  
  // ***** START SCOPE: inputProcessing *****
  startInputProcessing() {
    setInterval(() => {
      while (this.inputQueue.length > 0) {
        const input = this.inputQueue.shift();
        this.injectInput(input);
      }
    }, 8); // Process inputs at ~120Hz
  }
  
  queueInput(input) {
    this.inputQueue.push({
      ...input,
      timestamp: Date.now()
    });
  }
  
  injectInput(input) {
    if (!this.Module || !this.Module.ccall) return;
    
    switch (input.type) {
      case 'keyboard':
        // Inject keyboard event into VICE
        if (input.action === 'down') {
          this.Module.ccall('keyboard_key_pressed', null, 
            ['number'], [input.keyCode]);
        } else {
          this.Module.ccall('keyboard_key_released', null, 
            ['number'], [input.keyCode]);
        }
        break;
        
      case 'joystick':
        // Set joystick state
        // VICE uses different values for joystick directions
        const joyValue = this.calculateJoystickValue(input.state);
        this.Module.ccall('joystick_set_value', null,
          ['number', 'number'], [input.port || 2, joyValue]);
        break;
    }
  }
  
  calculateJoystickValue(state) {
    let value = 0;
    if (state.up) value |= 1;
    if (state.down) value |= 2;
    if (state.left) value |= 4;
    if (state.right) value |= 8;
    if (state.fire) value |= 16;
    return value;
  }
  // ***** END SCOPE: inputProcessing *****
  
  // ***** START SCOPE: lifecycle *****
  getFrame() {
    return this.frameBuffer;
  }
  
  shutdown() {
    this.isRunning = false;
    // Clean up VICE instance
    if (this.Module && this.Module._vice_shutdown) {
      this.Module._vice_shutdown();
    }
  }
  // ***** END SCOPE: lifecycle *****
}
// ***** END SCOPE: serverCore *****

// ***** START SCOPE: webSocketServer *****
class StreamingServer {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.instances = new Map(); // gameId -> VICEServerInstance
    
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  // ***** START SCOPE: httpRoutes *****
  setupRoutes() {
    this.app.use(express.static('public'));
    
    // Serve the client-side viewer
    this.app.get('/testing', (req, res) => {
    res.sendFile('index.html', { root: 'public/testing' });
});
    
    // Create new game instance
    this.app.post('/game/create', express.json(), (req, res) => {
      const gameId = this.generateGameId();
      const instance = new VICEServerInstance(gameId);
      this.instances.set(gameId, instance);
      
      res.json({ 
        gameId, 
        wsUrl: `ws://localhost:3000/game/${gameId}` 
      });
    });
  }
  // ***** END SCOPE: httpRoutes *****
  
  // ***** START SCOPE: webSocketHandling *****
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      // Extract gameId from URL
      const gameId = req.url.split('/').pop();
      const instance = this.instances.get(gameId);
      
      if (!instance) {
        ws.close(1008, 'Game instance not found');
        return;
      }
      
      console.log(`Client connected to game ${gameId}`);
      
      // Set up frame streaming
      const frameInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const frame = instance.getFrame();
          if (frame) {
            ws.send(frame, { binary: true });
          }
        }
      }, 33); // 30fps
      
      // Handle client input
      ws.on('message', (data) => {
        try {
          const input = JSON.parse(data);
          instance.queueInput(input);
        } catch (e) {
          console.error('Invalid input data:', e);
        }
      });
      
      // Clean up on disconnect
      ws.on('close', () => {
        clearInterval(frameInterval);
        console.log(`Client disconnected from game ${gameId}`);
      });
    });
  }
  // ***** END SCOPE: webSocketHandling *****
  
  // ***** START SCOPE: utilities *****
  generateGameId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  start() {
    this.server.listen(3000, () => {
      console.log('VICE streaming server running on http://localhost:3000');
    });
  }
  // ***** END SCOPE: utilities *****
}
// ***** END SCOPE: webSocketServer *****

// ***** START SCOPE: clientViewer *****
// client.js - Browser-side viewer
class VICEStreamClient {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 384;
    this.canvas.height = 272;
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    this.ws = null;
    this.gameId = null;
    
    this.setupInputHandlers();
  }
  
  // ***** START SCOPE: connection *****
  async connect(gameId) {
    this.gameId = gameId;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:3000/game/${gameId}`);
      
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        console.log('Connected to game:', gameId);
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleFrame(event.data);
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from game');
      };
    });
  }
  // ***** END SCOPE: connection *****
  
  // ***** START SCOPE: frameHandling *****
  handleFrame(data) {
    // Convert ArrayBuffer to ImageData
    const uint8Array = new Uint8Array(data);
    const imageData = new ImageData(
      new Uint8ClampedArray(uint8Array),
      384,
      272
    );
    
    // Draw to canvas
    this.ctx.putImageData(imageData, 0, 0);
  }
  // ***** END SCOPE: frameHandling *****
  
  // ***** START SCOPE: inputCapture *****
  setupInputHandlers() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      
      this.ws.send(JSON.stringify({
        type: 'keyboard',
        action: 'down',
        keyCode: this.mapKeyCode(e.keyCode),
        key: e.key
      }));
      
      e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      
      this.ws.send(JSON.stringify({
        type: 'keyboard',
        action: 'up',
        keyCode: this.mapKeyCode(e.keyCode),
        key: e.key
      }));
      
      e.preventDefault();
    });
    
    // Joystick emulation with arrow keys
    this.setupJoystickEmulation();
  }
  
  mapKeyCode(browserKeyCode) {
    // Map browser keycodes to C64 keycodes
    // This is a simplified mapping - full implementation would be more complex
    const keyMap = {
      13: 0x01,  // Return
      32: 0x20,  // Space
      // Add more mappings...
    };
    
    return keyMap[browserKeyCode] || browserKeyCode;
  }
  
  setupJoystickEmulation() {
    const joystickState = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    };
    
    const sendJoystickState = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      
      this.ws.send(JSON.stringify({
        type: 'joystick',
        port: 2,
        state: joystickState
      }));
    };
    
    // Arrow keys for directions, Ctrl for fire
    const keyToJoystick = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Control': 'fire'
    };
    
    document.addEventListener('keydown', (e) => {
      const direction = keyToJoystick[e.key];
      if (direction && !joystickState[direction]) {
        joystickState[direction] = true;
        sendJoystickState();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      const direction = keyToJoystick[e.key];
      if (direction && joystickState[direction]) {
        joystickState[direction] = false;
        sendJoystickState();
      }
    });
  }
  // ***** END SCOPE: inputCapture *****
}
// ***** END SCOPE: clientViewer *****

// ***** START SCOPE: usage *****
// Server startup
if (typeof module !== 'undefined' && module.exports) {
  const server = new StreamingServer();
  server.start();
}

// Client usage (in browser)
/*
const client = new VICEStreamClient('game-container');

// Create a new game instance
fetch('/game/create', { method: 'POST' })
  .then(res => res.json())
  .then(data => {
    return client.connect(data.gameId);
  })
  .then(() => {
    console.log('Ready to play!');
  });
*/
// ***** END SCOPE: usage *****

// ***** END SCOPE: serverArchitecture *****