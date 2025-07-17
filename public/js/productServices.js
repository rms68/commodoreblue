// public/js/productServices.js
(function() {
  async function fetchProducts(query = "", collection = null) {
    // Debug: Log what's being requested
    console.log('Fetching products - Query:', query, 'Collection:', collection);
    
    try {
      let endpoint = "products_api.php";
      const params = [];
      if (query) {
        params.push("query=" + encodeURIComponent(query));
      }
      if (collection) {
        params.push("collection=" + encodeURIComponent(collection));
      }
      if (params.length) {
        endpoint += "?" + params.join("&");
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Debug: Log raw response
      console.log('=== RAW API RESPONSE ===');
      console.log('Collection:', collection);
      console.log('Number of items returned:', data.length);
      console.log('First 3 items:', data.slice(0, 3));
      console.log('=== END RAW RESPONSE ===');
      
      const mappedProducts = data.map(prod => {
        // Ensure price and stock are numeric:
        prod.price = parseFloat(prod.price);
        if (isNaN(prod.price)) {
          prod.price = 0;
        }
        prod.stock = parseInt(prod.stock, 10);
        if (isNaN(prod.stock)) {
          prod.stock = 0;
        }

        // Standardize property names
        prod.id = prod.product_id;
        prod.image = prod.image_url;
        // Include the preview URL if provided
        prod.preview_url = prod.preview_url || '';

        return prod;
      });
      
      // Debug: Log mapped products
      console.log('=== MAPPED PRODUCTS DEBUG ===');
      console.log('Collection:', collection);
      console.log('Products returned:', mappedProducts.length);
      mappedProducts.forEach((prod, idx) => {
        console.log(`Product ${idx}:`, {
          id: prod.product_id,
          name: prod.name,
          image_url: prod.image_url,
          files: prod.files,
          files_count: prod.files ? prod.files.length : 0,
          hasImageUrl: !!prod.image_url,
          hasFiles: !!prod.files && prod.files.length > 0
        });
      });
      console.log('=== END PRODUCTS DEBUG ===');
      
      return mappedProducts;
    } catch (error) {
      console.error("API fetch failed:", error);
      if (window.displayManager) {
        displayManager.writeLine(`Could not connect to product database. Error: ${error.message}`);
      }
      return [];
    }
  }

  function sortResults(criteria) {
    const currentResults = viewRenderer.getCurrentResults();
    if (!currentResults || !currentResults.length) {
      displayManager.writeLine("No active results to sort.\n");
      return;
    }
    let c = criteria.toLowerCase();
    if (c === "price asc" || c === "price up") {
      currentResults.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (c === "price desc" || c === "price down") {
      currentResults.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (c === "popular" || c === "pop") {
      currentResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (c === "newest" || c === "new") {
      currentResults.sort((a, b) => {
        if (a.dateAdded && b.dateAdded) {
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        }
        return 0;
      });
    } else {
      displayManager.writeLine("Unknown sort criteria.\n");
      return;
    }
    viewRenderer.setCurrentSort(c);
    displayManager.writeLine(`Sorted results by ${criteria}.`);

    const currentContext = viewRenderer.getCurrentContext();
    if (currentContext === 'categories') {
      viewRenderer.renderCategoriesView(currentResults);
    } else {
      viewRenderer.renderProductsView(currentResults);
    }
    displayManager.renderScreen();
  }

  window.productServices = {
    fetchProducts,
    sortResults
  };
})();