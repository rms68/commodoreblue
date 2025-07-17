// c64Syntax.js - Commodore 64 inspired command translation layer
(function(){
  const C64_COMMAND_MAP = {
    'HELP': 'help',
    '?': 'help',
    'DIR': 'list',
    'CATALOG': 'list',
    'HOME': 'shop',
    'LOAD"$"': 'shop',
    'DIR ALL': 'list all',
    'CATALOG *': 'list all',

    'CD': 'load',
    'OPEN': 'load',
    'GROUP': 'category',
    '@': 'category',

    'EXAM': 'detail',
    'TYPE': 'detail',

    'GET': 'cart add',
    'BASKET': 'cart',
    'DROP': 'cart remove',
    'REM': 'cart remove',
    'BUY': 'checkout',
    'MON CART': 'debug checkout',
    'SYS CART': 'debug checkout',
    'NEW CART': 'clear session',
    'RESET': 'clear session',

    'FIND': 'search',
    'SEEK': 'search',

    'ORDER': 'sort',
    'ARRANGE': 'sort',
    'FLIP': 'toggle view',
    'MODE': 'toggle view'
  };

  const SORT_CRITERIA_MAP = {
    'PRICE UP': 'price asc',
    'PRICE DOWN': 'price desc',
    'POP': 'popular',
    'NEW': 'newest'
  };

  let originalRunCommand = null;

  function init() {
    console.log("C64 Syntax: Attempting to initialize...");
    if (!window.commandManager) {
      console.error("C64 Syntax: commandManager not found");
      setTimeout(init, 500);
      return;
    }

    if (!window.commandManager.runCommand) {
      console.warn("C64 Syntax: No 'runCommand' found on commandManager.");
      return;
    }

    // Store the original runCommand
    originalRunCommand = window.commandManager.runCommand;

    // Override runCommand with translator
    window.commandManager.runCommand = function(cmd) {
      console.log(`C64 Syntax: Processing command: "${cmd}"`);
      const translatedCmd = translateCommand(cmd);
      console.log(`C64 Syntax: Translated "${cmd}" -> "${translatedCmd}"`);
      return originalRunCommand.call(window.commandManager, translatedCmd);
    };

    console.log("C64 Syntax: Command translation successfully initialized!");
  }

  function translateCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return cmd;
    const originalCmd = cmd;
    const upperCmd = cmd.trim().toUpperCase();

    // Category shortcuts with @
    if (upperCmd.startsWith('@')) {
      const catName = originalCmd.substring(1);
      return `category ${catName}`;
    }

    // Check for exact command matches
    if (C64_COMMAND_MAP[upperCmd]) {
      return C64_COMMAND_MAP[upperCmd];
    }

    // Commands with parameters
    const parts = upperCmd.split(' ');
    const baseCmd = parts[0];

    if (C64_COMMAND_MAP[baseCmd]) {
      const originalParts = originalCmd.trim().split(' ');
      const params = originalParts.slice(1).join(' ');
      return `${C64_COMMAND_MAP[baseCmd]} ${params}`.trim();
    }

    // Two-word base commands
    if (parts.length >= 2) {
      const twoWordBase = `${parts[0]} ${parts[1]}`;
      if (C64_COMMAND_MAP[twoWordBase]) {
        const originalParts = originalCmd.trim().split(' ');
        const params = originalParts.slice(2).join(' ');
        const translatedBase = C64_COMMAND_MAP[twoWordBase];
        return `${translatedBase} ${params}`.trim();
      }
    }

    // Sort criteria
    if (parts[0] === 'ORDER' || parts[0] === 'ARRANGE') {
      const criteriaKey = parts.slice(1).join(' ');
      if (SORT_CRITERIA_MAP[criteriaKey]) {
        return `sort ${SORT_CRITERIA_MAP[criteriaKey]}`;
      }
    }

    // If no translation, return as-is
    return originalCmd;
  }

  window.c64Syntax = {
    init,
    translateCommand,
    forceInit: function() {
      console.log("C64 Syntax: Force initialization requested");
      init();
    }
  };
})();
