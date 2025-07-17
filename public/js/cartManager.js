// cartManager.js
(function () {
  function addToCart(id) {
    displayManager.writeLine("Adding product " + id + " to cart…");

    productServices.fetchProducts()
      .then(products => {
        let product = null;
        const idx = parseInt(id, 10) - 1;
        const currentResults = viewRenderer.getCurrentResults();

        // look up by list index first, fall back to absolute ID
        if (!isNaN(idx) && currentResults[idx]) {
          product = currentResults[idx];
        } else {
          product = products.find(p => p.product_id == id || p.id == id);
        }

        if (!product) {
          displayManager.writeLine("Product not found.");
          return;
        }

        const img = viewRenderer.getImageUrl(product);

        // fire Snipcart programmatically
        const tempBtn = document.createElement("button");
        tempBtn.className = "snipcart-add-item";
        tempBtn.dataset.itemId = product.product_id || product.id;
        tempBtn.dataset.itemName = product.name || "Product";
        tempBtn.dataset.itemPrice = product.price || 0;
        tempBtn.dataset.itemDescription = product.description || "";
        tempBtn.dataset.itemImage = img;
        tempBtn.dataset.itemUrl = window.location.href;
        tempBtn.style.display = "none";
        document.body.appendChild(tempBtn);
        tempBtn.click();
        tempBtn.remove();

        displayManager.writeLine(`Product “${product.name}” added to cart.`);
      })
      .catch(err => displayManager.writeLine("Error: " + err.message));
  }

  function viewCart() {
    const cartBtn = document.querySelector(".snipcart-checkout");
    if (cartBtn) cartBtn.click();
    else displayManager.writeLine("Cart button not found.");
  }

  function checkout() {
    viewCart();
  }

  window.cartManager = { addToCart, viewCart, checkout };
})();
