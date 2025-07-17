// themeManager.js - Applies unified styling for all grid views, pagination, and detail panels

(function() {
  if (!window.UI_CONFIG) {
    console.error("ThemeManager Error: UI_CONFIG not found. Ensure uiConfig.js is loaded first.");
    return;
  }

  const { theme, layout, pagination } = window.UI_CONFIG;
  const gridCfg = layout.grid;
  const detailCfg = layout.detailPanel;

  // Grid item sizing
  const itemSize = gridCfg.itemSize || gridCfg.itemMinWidth || 200;
  const gap = gridCfg.gap || 16;
  const padding = gridCfg.itemPadding != null ? gridCfg.itemPadding : Math.floor(gap / 2);
  const borderWidth = gridCfg.borderWidth || 2;
  const borderColor = gridCfg.borderColor || theme.colors.text;
  const bgColor = gridCfg.bgColor || theme.colors.secondary;
  const hoverBorderColor = gridCfg.hoverBorderColor || theme.colors.accent;

  // Remove old styles
  const existing = document.getElementById('dynamic-theme-styles');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'dynamic-theme-styles';
  style.textContent = `
    /* Theme Manager: Unified Grid, Pagination, Detail Pane & Hover Preview */

    /* Core Typography & Colors */
    *, *::before, *::after {
      font-family: ${theme.fontFamily}, monospace;
    }
    body {
      background: ${theme.colors.primary};
      color: ${theme.colors.text};
    }

    /* GRID LAYOUT */
    .grid-container-wrapper {
      display: flex;
      justify-content: center;
      padding: ${gap}px 0;
    }
    .muuri-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(${itemSize}px, ${itemSize}px));
      grid-auto-rows: ${itemSize}px;
      gap: ${gap}px;
      justify-content: start;
    }
    /* Override Muuri positioning */
    .muuri-grid .grid-item {
      position: relative !important;
      transform: none !important;
    }

    /* GRID ITEM BASE */
    .grid-item {
      width: ${itemSize}px;
      height: ${itemSize}px;
      background-color: ${bgColor};
      padding: ${padding}px;
      border: ${borderWidth}px solid ${borderColor};
      box-sizing: border-box;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .grid-item:hover {
      border-color: ${hoverBorderColor};
    }

    /* CATEGORY OVERRIDE */
    .grid-item.category-item {
      background-color: ${theme.colors.primary};
      border-color: ${theme.colors.primary};
    }
    .grid-item.category-item:hover {
      border-color: ${hoverBorderColor};
    }

    /* PRODUCT CARD */
    .grid-item.product-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: ${bgColor};
    }
    .product-card .product-card-image {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
    }
    .product-card .product-card-info {
      margin-top: ${padding}px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* PROGRAM HOVER PREVIEW */
    .program-mini-desc {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      color: ${theme.colors.text};
      display: none;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: ${padding}px;
      box-sizing: border-box;
      font-size: 0.9rem;
    }
    .grid-item:hover .program-mini-desc {
      display: flex;
    }

    /* UNIFORM PAGINATION */
    .pagination {
      text-align: center;
      margin: ${gap}px 0;
    }
    .pagination a, .pagination span {
      display: inline-block;
      margin: 0 ${gap / 2}px;
      padding: ${padding / 2}px ${padding * 1.5}px;
      border: ${borderWidth}px solid ${borderColor};
      color: ${theme.colors.text};
      text-decoration: none;
      transition: background 0.2s, border-color 0.2s;
    }
    .pagination a:hover {
      border-color: ${hoverBorderColor};
      color: ${hoverBorderColor};
    }
    .pagination span.current {
      background-color: ${theme.colors.accent};
      border-color: ${theme.colors.accent};
      color: #000;
    }

    /* DETAIL PANEL SLIDE-IN */
    .detail-panel {
      position: fixed;
      top: ${detailCfg.baseTopOffset}px;
      right: 0;
      width: ${detailCfg.width}px;
      height: ${detailCfg.height}px;
      background: ${theme.colors.secondary};
      border: ${borderWidth}px solid ${borderColor};
      box-sizing: border-box;
      transform: translateX(${detailCfg.width + 20}px);
      transition: transform 0.3s ease-in-out;
      z-index: 2000;
      overflow: auto;
    }
    .detail-panel.open {
      transform: translateX(0);
    }

  `.trim();

  document.head.appendChild(style);
})();
