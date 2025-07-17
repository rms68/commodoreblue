// public/js/uiConfig.js
// This file contains the single source of truth for all UI configuration.
// It is loaded first and exposes the config globally via window.UI_CONFIG.
// public/js/uiConfig.js
(function() {
  const UI_CONFIG = {
    // … existing stuff …

    // --- Layout & Sizing (in pixels) ---
    layout: {
      grid: {
        itemMinWidth: 200,
        gap: 16      // only for grid gutters
      },
      nav: {
        gap: 8       // new: only for nav & menu spacing
      },
      detailPanel: {
        width: 400,
        height: 550,
        baseTopOffset: 40,
        stackSpacing: 60,
        removeDelay: 600,
      },
      gamingWindow: {
        totalHeight: 440,
        gameWidth: 640
      }
    }
  };

  window.UI_CONFIG = UI_CONFIG;
})();

(function() {
  const UI_CONFIG = {
    // --- General Behavior ---
    viewMode: 'list', // 'list' or 'grid'
    truncation: {
      default: 50,
      productDescription: 80,
      programDescription: 50, // This is for the grid view overlay
      gamingWindowDescription: 300 // This is for the gaming window's detail panel
    },
    pagination: {
      itemsPerPage: 10,
    },

    // --- Theming & Colors ---
    theme: {
      fontFamily: "'C64', monospace",
      colors: {
        primary: '#4040a0',   // Dark blue
        secondary: '#7878c8', // Light blue
        accent: '#50ff50',    // Green
        text: '#ffffff',
        background: '#000000',
      }
    },
     
    // --- Layout & Sizing (in pixels) ---
    layout: {
      grid: {
        itemMinWidth: 200,
        gap: 20
      },
      detailPanel: {
        width: 400,
        height: 550,
        baseTopOffset: 40,
        stackSpacing: 60,
        removeDelay: 600,
      },
      gamingWindow: {
        totalHeight: 440,    // Total window height
        gameWidth: 640,      // Width of game/preview area
        // gameHeight is calculated dynamically from gameWidth
      }
    }
  };

  // Expose the config globally so all other scripts can access it.
  window.UI_CONFIG = UI_CONFIG;

})();