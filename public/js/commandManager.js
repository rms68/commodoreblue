// public/js/commandManager.js
// Handles all C64-style command processing and navigation
// This is the main controller for the application

// ***** START SCOPE: commandManager *****
(function() {
  // ============================================
  // CORE VARIABLES AND STATE
  // ============================================
  
  // ***** START SCOPE: coreVariables *****
  // Core variables for keyboard and navigation management
  let keyCapture, navLinks;
  let currentContext = 'categories'; // What's currently displayed (categories, products, programs, or page name)
  let currentItems = []; // Items currently shown on screen (categories, products, or programs)
  // ***** END SCOPE: coreVariables *****
  
  // ***** START SCOPE: sessionState *****
  // Session state storage - preserves state when navigating between pages
  // This allows users to return to their previous view when using back navigation
  let sessionState = {
    categories: {
      items: [],        // Array of category objects
      screenLines: [],  // Saved screen content
      breadcrumbs: []   // Navigation breadcrumbs
    },
    products: {
      items: [],        // Array of product objects
      screenLines: [],  // Saved screen content
      breadcrumbs: [],  // Navigation breadcrumbs
      categoryName: ''  // Name of the current category
    },
    programs: {
      items: [],        // Array of program objects
      screenLines: [],  // Saved screen content
      breadcrumbs: []   // Navigation breadcrumbs
    }
  };
  // ***** END SCOPE: sessionState *****
  
  // ***** START SCOPE: constants *****
  // All valid page names that can be loaded
  const VALID_PAGES = ['home', 'shop', 'code', 'bbs', 'pro-play', 'bas-play'];
  // ***** END SCOPE: constants *****
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  // ***** START SCOPE: init *****
  /**
   * Initialize the command manager
   * Sets up keyboard handling, display manager, and initial screen
   * @param {Object} params - Contains keyCapture input, c64Output display, and navLinks
   */
  function init({ keyCapture: _keyCapture, c64Output: _c64Output, navLinks: _navLinks }) {
    keyCapture = _keyCapture;
    navLinks = _navLinks || [];

    // ***** START SCOPE: initDisplayManager *****
    // Initialize displayManager with the output element
    if (window.displayManager && typeof window.displayManager.init === 'function') {
      displayManager.init(_c64Output);
    } else {
      console.error('displayManager not available');
      return;
    }
    // ***** END SCOPE: initDisplayManager *****
    
    // ***** START SCOPE: initialScreenSetup *****
    // Initial screen setup - C64 boot screen (only shown once on startup)
    const initialLines = [
      { type: 'text', content: "*** COMMODORE 64 BASIC V2 ***" },
      { type: 'text', content: " 64K RAM SYSTEM  38911 BASIC BYTES FREE" },
      { type: 'text', content: "READY." }
    ];
    displayManager.setScreenLines(initialLines);
    displayManager.updateToggleButton();
    displayManager.setCurrentLine("");
    displayManager.renderScreen();
    // ***** END SCOPE: initialScreenSetup *****

    // ***** START SCOPE: keyboardSetup *****
    // Set up keyboard handling for C64-style input
    keyCapture.addEventListener("keydown", onKeyDown);
    // Ensure keyboard focus when clicking anywhere
    document.addEventListener("click", () => { keyCapture.focus(); });
    keyCapture.focus();
    // ***** END SCOPE: keyboardSetup *****

    // ***** START SCOPE: exposeRunCommand *****
    // Expose runCommand globally for other modules to use
    window.commandManager.runCommand = runCommand;
    // ***** END SCOPE: exposeRunCommand *****
  }
  // ***** END SCOPE: init *****

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // ***** START SCOPE: saveCurrentState *****
  /**
   * Save current view state before switching pages
   * Allows returning to the same place when navigating back
   */
  function saveCurrentState() {
    if (currentContext === 'categories' || currentContext === 'products' || currentContext === 'programs') {
      sessionState[currentContext] = {
        items: [...currentItems],
        screenLines: displayManager.getScreenLines().slice(), // Fixed: capital L in getScreenLines
        breadcrumbs: window.viewRenderer ? viewRenderer.getCurrentBreadcrumbs() : []
      };
      
      // Special handling for products - preserve category name
      if (currentContext === 'products' && sessionState.products.categoryName) {
        const temp = sessionState.products.categoryName;
        sessionState.products.categoryName = temp;
      }
    }
  }
  // ***** END SCOPE: saveCurrentState *****
  
  // ***** START SCOPE: restoreState *****
  /**
   * Restore previously saved state when returning to a view
   * @param {string} context - The context to restore (categories, products, programs)
   * @returns {boolean} - True if state was restored, false if no state to restore
   */
  function restoreState(context) {
    if ((context === 'categories' || context === 'products' || context === 'programs') && 
        sessionState[context].items.length > 0) {
      currentItems = sessionState[context].items;
      displayManager.setScreenLines(sessionState[context].screenLines);
      
      if (window.viewRenderer) {
        viewRenderer.setCurrentResults(currentItems);
        viewRenderer.updateBreadcrumbs(sessionState[context].breadcrumbs);
      }
      
      displayManager.renderScreen();
      return true;
    }
    return false;
  }
  // ***** END SCOPE: restoreState *****
  
  // ***** START SCOPE: clearScreenForPage *****
  /**
   * Clear screen for fresh page loads
   * FIXED: No longer shows C64 header on every page change
   */
  function clearScreenForPage() {
    // Only clear the screen, don't add the C64 header
    displayManager.setScreenLines([]);
  }
  // ***** END SCOPE: clearScreenForPage *****

  // ============================================
  // KEYBOARD INPUT HANDLING
  // ============================================
  
  // ***** START SCOPE: onKeyDown *****
  /**
   * Handle keyboard input for C64-style command entry
   * @param {KeyboardEvent} e - The keyboard event
   */
  function onKeyDown(e) {
    // ***** START SCOPE: characterInput *****
    // Handle normal character input
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      let char = e.key.toUpperCase();
      let currentLine = displayManager.getCurrentLine() + char;
      displayManager.setCurrentLine(currentLine);
      displayManager.updatePromptLineOnly();
      return;
    }
    // ***** END SCOPE: characterInput *****
    
    // ***** START SCOPE: backspaceHandling *****
    // Handle backspace to delete characters
    if (e.key === "Backspace") {
      e.preventDefault();
      let currentLine = displayManager.getCurrentLine();
      if (currentLine.length > 0) {
        displayManager.setCurrentLine(currentLine.slice(0, -1));
        displayManager.updatePromptLineOnly();
      }
      return;
    }
    // ***** END SCOPE: backspaceHandling *****
    
    // ***** START SCOPE: enterHandling *****
    // Handle enter - execute command
    if (e.key === "Enter") {
      e.preventDefault();
      const command = displayManager.getCurrentLine().trim();
      // Add the command to screen history
      displayManager.getScreenLines().push({ type: 'text', content: "> " + command.toUpperCase() });
      displayManager.setCurrentLine("");
      runCommand(command);
      displayManager.renderScreen();
    }
    // ***** END SCOPE: enterHandling *****
    
    // ***** START SCOPE: escapeHandling *****
    // Handle escape - clear current line
    if (e.key === "Escape") {
      e.preventDefault();
      displayManager.setCurrentLine("");
      displayManager.updatePromptLineOnly();
    }
    // ***** END SCOPE: escapeHandling *****
  }
  // ***** END SCOPE: onKeyDown *****

  // ============================================
  // COMMAND PROCESSING
  // ============================================
  
  // ***** START SCOPE: runCommand *****
  /**
   * Main command processor - interprets and executes user commands
   * @param {string} cmd - The command to execute
   */
  function runCommand(cmd) {
    if (!cmd) return;
    
    // ***** START SCOPE: parseCommand *****
    // Parse the command into parts
    const normalized = cmd.toLowerCase().trim();
    const parts = normalized.split(' ');
    const command = parts[0];
    const target = parts.slice(1).join(' ');
    
    console.log('runCommand:', { cmd, command, target, currentContext });
    // ***** END SCOPE: parseCommand *****
    
    // ***** START SCOPE: commandSwitch *****
    // Handle different commands
    switch(command) {
      // ***** START SCOPE: helpCommand *****
      case 'help':
      case '?':
        showHelp();
        break;
      // ***** END SCOPE: helpCommand *****
        
      // ***** START SCOPE: loadCommand *****
      case 'load':
        handleLoad(target);
        break;
      // ***** END SCOPE: loadCommand *****
        
      // ***** START SCOPE: listCommand *****
      case 'list':
      case 'dir':
        handleList();
        break;
      // ***** END SCOPE: listCommand *****
        
      // ***** START SCOPE: clearCommand *****
      case 'clear':
      case 'cls':
        clearScreen();
        break;
      // ***** END SCOPE: clearCommand *****
        
      // ***** START SCOPE: toggleCommand *****
      case 'toggle':
        if (window.displayManager && typeof window.displayManager.toggleView === 'function') {
          displayManager.toggleView();
        }
        break;
      // ***** END SCOPE: toggleCommand *****
        
      // ***** START SCOPE: addCommand *****
      case 'add':
        // Only works in products context for adding to cart
        if (currentContext === 'products' && target) {
          if (window.cartManager) {
            cartManager.addToCart(target);
          }
        } else if (currentContext === 'products') {
          displayManager.writeLine("SYNTAX: ADD <PRODUCT NUMBER>");
        } else {
          displayManager.writeLine("ADD COMMAND ONLY WORKS FOR PRODUCTS");
        }
        break;
      // ***** END SCOPE: addCommand *****
       
      // ***** START SCOPE: gameCommands *****
      case 'fastload':
        if (window.gameManager) {
          if (target === 'on') {
            gameManager.setFastLoad(true);
            displayManager.writeLine("FAST LOAD ENABLED");
          } else if (target === 'off') {
            gameManager.setFastLoad(false);
            displayManager.writeLine("FAST LOAD DISABLED");
          } else {
            gameManager.toggleFastLoad();
          }
        }
        break;

      case 'warp':
        if (window.gameManager) {
          if (target === 'on') {
            gameManager.setWarpMode(true);
            displayManager.writeLine("WARP MODE ENABLED");
          } else if (target === 'off') {
            gameManager.setWarpMode(false);
            displayManager.writeLine("WARP MODE DISABLED");
          } else {
            gameManager.toggleWarpMode();
          }
        }
        break;
      
      case 'play':
      case 'run':
        if (window.gameManager) {
          gameManager.launchByName(target);
        } else {
          displayManager.writeLine("GAME MANAGER NOT AVAILABLE");
        }
        break;
        
      case 'stop':
      case 'quit':
        if (window.gameManager) {
          gameManager.closeGame();
        } else {
          displayManager.writeLine("GAME MANAGER NOT AVAILABLE");
        }
        break;
      // ***** END SCOPE: gameCommands *****
        
      // ***** START SCOPE: defaultCommand *****
      default:
        displayManager.writeLine(`UNKNOWN COMMAND: ${cmd.toUpperCase()}`);
        displayManager.writeLine("TYPE 'HELP' FOR COMMANDS");
      // ***** END SCOPE: defaultCommand *****
    }
    // ***** END SCOPE: commandSwitch *****
  }
  // ***** END SCOPE: runCommand *****

  // ============================================
  // LOAD COMMAND HANDLER
  // ============================================
  
  // ***** START SCOPE: handleLoad *****
  /**
   * Handle LOAD command - the universal navigation/click command
   * @param {string} target - What to load (page name, item number, or item name)
   */
  function handleLoad(target) {
    // ***** START SCOPE: validateLoadTarget *****
    if (!target) {
      displayManager.writeLine("SYNTAX: LOAD <NUMBER OR NAME>");
      displayManager.writeLine("LOADS (CLICKS) THE ITEM FROM CURRENT LIST");
      return;
    }
    
    const lowerTarget = target.toLowerCase();
    // ***** END SCOPE: validateLoadTarget *****
    
    // ***** START SCOPE: checkLoadPage *****
    // Check if loading a page
    if (VALID_PAGES.includes(lowerTarget)) {
      loadPage(lowerTarget);
      return;
    }
    // ***** END SCOPE: checkLoadPage *****
    
    // ***** START SCOPE: checkLoadCart *****
    // Special cart handling (only for shop context)
    if ((lowerTarget === 'cart' || lowerTarget === 'basket') && 
        (currentContext === 'categories' || currentContext === 'products')) {
      if (window.cartManager) {
        cartManager.viewCart();
      }
      return;
    }
    // ***** END SCOPE: checkLoadCart *****
    
    // ***** START SCOPE: handleItemSelection *****
    // Handle item selection in list contexts
    if (currentContext === 'categories' || currentContext === 'products' || currentContext === 'programs') {
      // ***** START SCOPE: loadByNumber *****
      // Try loading by number (1-based index)
      const num = parseInt(target);
      if (!isNaN(num) && num > 0 && num <= currentItems.length) {
        const item = currentItems[num - 1];
        clickItem(item);
        return;
      }
      // ***** END SCOPE: loadByNumber *****
      
      // ***** START SCOPE: loadByName *****
      // Try loading by name (partial match)
      const foundItem = currentItems.find(item => {
        const itemName = (item.name || item.title || '').toLowerCase();
        return itemName === lowerTarget || itemName.includes(lowerTarget);
      });
      
      if (foundItem) {
        clickItem(foundItem);
        return;
      }
      // ***** END SCOPE: loadByName *****
    }
    // ***** END SCOPE: handleItemSelection *****
    
    // ***** START SCOPE: loadNotFound *****
    displayManager.writeLine(`"${target.toUpperCase()}" NOT FOUND`);
    displayManager.writeLine("USE LIST TO SEE AVAILABLE ITEMS");
    // ***** END SCOPE: loadNotFound *****
  }
  // ***** END SCOPE: handleLoad *****

  // ***** START SCOPE: clickItem *****
  /**
   * Handle clicking/selecting an item based on current context
   * @param {Object} item - The item that was clicked
   */
  function clickItem(item) {
    console.log('Clicking item:', item, 'in context:', currentContext);
    
    if (currentContext === 'categories') {
      // Clicking a category loads its products
      loadCategoryProducts(item.name);
    } else if (currentContext === 'products') {
      // Clicking a product shows its detail panel
      showProductDetail(item);
    } else if (currentContext === 'programs') {
      // Clicking a program shows its detail panel
      showProgramDetail(item);
    }
  }
  // ***** END SCOPE: clickItem *****

  // ============================================
  // LIST/DIR COMMAND HANDLER
  // ============================================
  
  // ***** START SCOPE: handleList *****
  /**
   * Handle LIST/DIR command - shows current directory
   */
  function handleList() {
    switch(currentContext) {
      // ***** START SCOPE: listCategories *****
      case 'categories':
        loadCategoriesView();
        break;
      // ***** END SCOPE: listCategories *****
        
      // ***** START SCOPE: listProducts *****
      case 'products':
        // Refresh product list
        displayManager.writeLine("REFRESHING LIST...");
        if (window.viewRenderer && currentItems.length > 0) {
          viewRenderer.renderProductsView(currentItems);
        }
        break;
      // ***** END SCOPE: listProducts *****
        
      // ***** START SCOPE: listPrograms *****
      case 'programs':
        // Refresh programs list
        displayManager.writeLine("REFRESHING LIST...");
        if (window.viewRenderer && currentItems.length > 0) {
          viewRenderer.renderProgramsView(currentItems);
        }
        break;
      // ***** END SCOPE: listPrograms *****
        
      // ***** START SCOPE: listDefault *****
      default:
        // For page contexts, show navigation options
        displayManager.writeLine("");
        displayManager.writeLine("CURRENT LOCATION: " + currentContext.toUpperCase());
        displayManager.writeLine("");
        displayManager.writeLine("AVAILABLE COMMANDS:");
        displayManager.writeLine("  LOAD HOME     - Main page");
        displayManager.writeLine("  LOAD SHOP     - Product catalog");
        displayManager.writeLine("  LOAD CODE     - Code playground");
        displayManager.writeLine("  LOAD BBS      - Bulletin board");
        displayManager.writeLine("  LOAD PRO-PLAY - PRG player");
        displayManager.writeLine("  LOAD BAS-PLAY - BASIC programs");
        displayManager.writeLine("");
        break;
      // ***** END SCOPE: listDefault *****
    }
  }
  // ***** END SCOPE: handleList *****

  // ============================================
  // UTILITY COMMANDS
  // ============================================
  
  // ***** START SCOPE: clearScreen *****
  /**
   * Clear the screen completely
   */
  function clearScreen() {
    displayManager.setScreenLines([]);
    displayManager.writeLine("READY.");
  }
  // ***** END SCOPE: clearScreen *****

  // ***** START SCOPE: showHelp *****
  /**
   * Show context-sensitive help text
   */
  function showHelp() {
    let helpText = `
SIMPLIFIED C64 COMMANDS
======================

LOAD <ITEM>  - Click/select item from current list
               Examples:
               LOAD 1      - Click first item
               LOAD 3      - Click third item  
               LOAD GAMES  - Click "Games" category`;
    
    // ***** START SCOPE: cartHelpText *****
    // Only show cart commands in shop context
    if (currentContext === 'categories' || currentContext === 'products') {
      helpText += `
               LOAD CART   - Open shopping cart
ADD <NUM>    - Add product to cart`;
    }
    // ***** END SCOPE: cartHelpText *****
    
    // ***** START SCOPE: playHelpText *****
    // Show play command in programs context
    if (currentContext === 'programs') {
      helpText += `

PLAY <NUM>   - Launch program in emulator
               Examples:
               PLAY 1      - Play first program
               PLAY GAME   - Play program with "game" in name
STOP         - Close emulator window`;
    }
    // ***** END SCOPE: playHelpText *****
    
    helpText += `

LIST / DIR   - Show current directory
TOGGLE       - Toggle between list/grid view
HELP / ?     - Show this help
CLEAR / CLS  - Clear screen

TIPS:
- Numbers refer to items in the list above
- Names can be partial (LOAD GAM for Games)
- Context sensitive: what you see is what you can load
`;
    displayManager.writeLine(helpText);
  }
  // ***** END SCOPE: showHelp *****

  // ============================================
  // PAGE LOADING
  // ============================================
  
  // ***** START SCOPE: loadPage *****
  /**
   * Load a specific page (home, shop, code, etc.)
   * @param {string} pageName - Name of the page to load
   */
  function loadPage(pageName) {
    // ***** START SCOPE: checkReload *****
    // Check if we're reloading the current page
    const isReloadingSamePage = (currentContext === pageName) || 
                                (pageName === 'shop' && (currentContext === 'categories' || currentContext === 'products')) ||
                                (pageName === 'bas-play' && currentContext === 'programs');
    
    // Save current state before switching (unless reloading same page)
    if (!isReloadingSamePage) {
      saveCurrentState();
    }
    // ***** END SCOPE: checkReload *****
    
    // ***** START SCOPE: preparePageLoad *****
    // Clear screen for fresh page load
    clearScreenForPage();
    
    displayManager.writeLine(`LOADING ${pageName.toUpperCase()}...`);
    
    // Update current context
    currentContext = pageName;
    currentItems = []; // Clear items since we're on a page
    
    // Update breadcrumbs
    if (window.viewRenderer) {
      viewRenderer.updateBreadcrumbs([{ label: pageName.toUpperCase(), type: "text" }]);
    }
    // ***** END SCOPE: preparePageLoad *****
    
    // ***** START SCOPE: pageSwitch *****
    // Handle each page
    switch(pageName) {
      // ***** START SCOPE: homePage *****
      case 'home':
        // FIXED: Don't show duplicate C64 header
        displayManager.writeLine("");
        displayManager.writeLine("**** COMMODORE BLUE HOME ****");
        displayManager.writeLine("");
        displayManager.writeLine("WELCOME TO THE RETRO COMPUTING STORE");
        displayManager.writeLine("");
        displayManager.writeLine("AVAILABLE SECTIONS:");
        displayManager.writeLine("  LOAD SHOP     - BROWSE PRODUCTS");
        displayManager.writeLine("  LOAD CODE     - CODE PLAYGROUND");
        displayManager.writeLine("  LOAD BBS      - BULLETIN BOARD");
        displayManager.writeLine("  LOAD PRO-PLAY - PRG PLAYER");
        displayManager.writeLine("  LOAD BAS-PLAY - BASIC PROGRAMS");
        displayManager.writeLine("");
        displayManager.writeLine("TYPE 'HELP' FOR COMMANDS");
        break;
      // ***** END SCOPE: homePage *****
        
      // ***** START SCOPE: shopPage *****
      case 'shop':
        // Shop loads categories view
        currentContext = 'categories';
        if (isReloadingSamePage || !restoreState('categories')) {
          loadCategoriesView();
        }
        return; // Don't add READY below
      // ***** END SCOPE: shopPage *****
        
      // ***** START SCOPE: codePage *****
      case 'code':
        displayManager.writeLine("");
        displayManager.writeLine("=== CODE PLAYGROUND ===");
        displayManager.writeLine("");
        displayManager.writeLine("INTERACTIVE CODING ENVIRONMENT");
        displayManager.writeLine("COMING SOON!");
        displayManager.writeLine("");
        displayManager.writeLine("FEATURES PLANNED:");
        displayManager.writeLine("- BASIC INTERPRETER");
        displayManager.writeLine("- 6502 ASSEMBLY");
        displayManager.writeLine("- SPRITE EDITOR");
        displayManager.writeLine("- SOUND DESIGNER");
        break;
      // ***** END SCOPE: codePage *****
        
      // ***** START SCOPE: bbsPage *****
      case 'bbs':
        displayManager.writeLine("");
        displayManager.writeLine("╔═══════════════════════════════╗");
        displayManager.writeLine("║     COMMODORE BLUE BBS        ║");
        displayManager.writeLine("╚═══════════════════════════════╝");
        displayManager.writeLine("");
        displayManager.writeLine("CONNECTING TO BULLETIN BOARD...");
        displayManager.writeLine("");
        displayManager.writeLine("NO CARRIER");
        displayManager.writeLine("");
        displayManager.writeLine("(FEATURE COMING SOON)");
        break;
      // ***** END SCOPE: bbsPage *****
        
      // ***** START SCOPE: proPlayPage *****
      case 'pro-play':
        displayManager.writeLine("");
        displayManager.writeLine("*** PRG PLAYER ***");
        displayManager.writeLine("");
        displayManager.writeLine("LOAD AND RUN C64 PROGRAMS");
        displayManager.writeLine("IN YOUR BROWSER!");
        displayManager.writeLine("");
        displayManager.writeLine("DRAG & DROP .PRG FILES HERE");
        displayManager.writeLine("(COMING SOON)");
        break;
      // ***** END SCOPE: proPlayPage *****
        
      // ***** START SCOPE: basPlayPage *****
      case 'bas-play':
        // BAS-PLAY loads programs from Directus 'programs' collection
        currentContext = 'programs';
        if (isReloadingSamePage || !restoreState('programs')) {
          loadProgramsView();
        }
        return; // Don't add READY below
      // ***** END SCOPE: basPlayPage *****
        
      // ***** START SCOPE: defaultPage *****
      default:
        displayManager.writeLine(`PAGE '${pageName.toUpperCase()}' NOT IMPLEMENTED YET.`);
        break;
      // ***** END SCOPE: defaultPage *****
    }
    // ***** END SCOPE: pageSwitch *****
    
    displayManager.writeLine("");
    displayManager.writeLine("READY.");
  }
  // ***** END SCOPE: loadPage *****

  // ============================================
  // CATEGORY VIEW LOADING
  // ============================================
  
  // ***** START SCOPE: loadCategoriesView *****
  /**
   * Load categories view (shop landing page)
   * Fetches categories from API and displays them
   */
  function loadCategoriesView() {
    // Only show loading message when coming from different context
    if (currentContext !== 'shop' && currentContext !== 'categories') {
      displayManager.writeLine("LOADING CATEGORIES...");
    }
    
    fetch('collections_api.php')
      .then(response => response.json())
      .then(collectionsData => {
        let collections = Array.isArray(collectionsData) ? collectionsData : [];
        
        currentContext = 'categories';
        currentItems = collections;
        
        if (window.viewRenderer) {
          viewRenderer.setCurrentContext('categories');
          viewRenderer.updateBreadcrumbs([{ label: "Shop", type: "text" }]);
          viewRenderer.setCurrentResults(collections);
          viewRenderer.renderCategoriesView(collections);
        }
        displayManager.renderScreen();
      })
      .catch(err => {
        displayManager.writeLine("ERROR LOADING CATEGORIES: " + err.message);
        displayManager.renderScreen();
      });
  }
  // ***** END SCOPE: loadCategoriesView *****

  // ============================================
  // PRODUCT VIEW LOADING
  // ============================================
  
  // ***** START SCOPE: loadCategoryProducts *****
  /**
   * Load products for a specific category
   * FIXED: No longer adds duplicate "FOUND X PRODUCTS" message
   * @param {string} categoryName - Name of the category to load
   */
  function loadCategoryProducts(categoryName) {
    // Save current state before loading products
    saveCurrentState();
    
    displayManager.writeLine(`LOADING ${categoryName.toUpperCase()}...`);
    
    if (!window.productServices) {
      displayManager.writeLine("PRODUCT SERVICES NOT AVAILABLE.");
      return;
    }
    
    productServices.fetchProducts("", categoryName)
      .then(products => {
        currentContext = 'products';
        currentItems = products;
        
        // Store category name for session
        sessionState.products.categoryName = categoryName;
        
        if (window.viewRenderer) {
          viewRenderer.setCurrentContext('products');
          viewRenderer.setCurrentResults(products);
          viewRenderer.updateBreadcrumbs([
            { label: "Shop", type: "link", action: "load shop" },
            { label: categoryName, type: "text" }
          ]);
          viewRenderer.renderProductsView(products);
        }
        
        // FIXED: Don't add extra text - it's now part of renderProductsView
        displayManager.renderScreen();
      })
      .catch(err => {
        displayManager.writeLine("ERROR: " + err.message);
      });
  }
  // ***** END SCOPE: loadCategoryProducts *****

  // ============================================
  // PROGRAM VIEW LOADING
  // ============================================
  
  // ***** START SCOPE: loadProgramsView *****
  /**
   * Load programs view (bas-play page)
   * Fetches programs from the 'programs' collection
   */
  function loadProgramsView() {
    displayManager.writeLine("LOADING PROGRAMS...");
    
    // Fetch programs from the 'programs' collection using products_api.php
    fetch('products_api.php?collection=programs')
      .then(response => response.json())
      .then(programsData => {
        let programs = Array.isArray(programsData) ? programsData : [];
        
        currentContext = 'programs';
        currentItems = programs;
        
        if (window.viewRenderer) {
          viewRenderer.setCurrentContext('programs');
          viewRenderer.updateBreadcrumbs([{ label: "Programs", type: "text" }]);
          viewRenderer.setCurrentResults(programs);
          viewRenderer.renderProgramsView(programs);
        }
        
        displayManager.renderScreen();
      })
      .catch(err => {
        displayManager.writeLine("ERROR LOADING PROGRAMS: " + err.message);
        displayManager.renderScreen();
      });
  }
  // ***** END SCOPE: loadProgramsView *****

  // ============================================
  // DETAIL VIEW HANDLERS
  // ============================================
  
  // ***** START SCOPE: showProductDetail *****
  /**
   * Show product detail panel with shopping cart functionality
   * @param {Object} product - The product to display
   */
  function showProductDetail(product) {
    if (window.viewRenderer && typeof window.viewRenderer.renderDetailView === 'function') {
      viewRenderer.renderDetailView(product);
      displayManager.writeLine(`LOADED: ${product.name.toUpperCase()}`);
    } else {
      displayManager.writeLine("DETAIL VIEW NOT AVAILABLE.");
    }
  }
  // ***** END SCOPE: showProductDetail *****

  // ***** START SCOPE: showProgramDetail *****
  /**
   * Show program detail panel (no cart functionality, has emulator)
   * @param {Object} program - The program to display
   */
  function showProgramDetail(program) {
    if (window.viewRenderer && typeof window.viewRenderer.renderProgramDetailView === 'function') {
      viewRenderer.renderProgramDetailView(program);
      displayManager.writeLine(`LOADED: ${program.name.toUpperCase()}`);
    } else {
      displayManager.writeLine("DETAIL VIEW NOT AVAILABLE.");
    }
  }
  // ***** END SCOPE: showProgramDetail *****

  // ============================================
  // MODULE EXPORT
  // ============================================
  
  // ***** START SCOPE: moduleExport *****
  // Expose the command manager API
  window.commandManager = {
    init,
    runCommand,
    
    // Utility functions for other modules
    writeLine: function(text) {
      if (window.displayManager && typeof window.displayManager.writeLine === 'function') {
        displayManager.writeLine(text);
      }
    },
    
    newPromptLine: function() {
      if (window.displayManager && typeof window.displayManager.renderScreen === 'function') {
        displayManager.renderScreen();
      }
    },
    
    // Expose state functions for debugging
    saveCurrentState,
    restoreState,
    getSessionState: function() { return sessionState; },
    getCurrentContext: function() { return currentContext; }
  };
  // ***** END SCOPE: moduleExport *****
  
})();
// ***** END SCOPE: commandManager *****