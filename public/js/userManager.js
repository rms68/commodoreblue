/*  public/js/userManager.js
    Works as a classic <script> (no ES-module keywords)               */
(function (w) {
  "use strict";

  let currentUser = null;           // cached user object
  let ready       = false;          // init finished?

  /** helper – GET /user_api.php (returns {} when it fails) */
  async function fetchUser () {
    try {
      const res = await fetch("/user_api.php", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return j && Object.keys(j).length ? j : null;
    } catch (e) {
      console.warn("[userManager] guest mode (API not available)", e);
      return null;
    }
  }

  /** public – initialise user system */
  async function init () {
    if (ready) return;              // guard
    currentUser = await fetchUser();
    ready = true;

    /* optional: update UI banner                                    */
    const hdr = document.getElementById("commands");
    if (hdr) {
      hdr.textContent = currentUser
        ? `[Commands]  Logged in as ${currentUser.username || "user"}`
        : `[Commands]  Guest`;
    }
  }

  /** public – return cached user (null if guest) */
  function getUser () {
    return currentUser;
  }

  /** public – true when logged in */
  function isLoggedIn () {
    return !!currentUser;
  }

  /** public – clears cache and reloads page (simple logout) */
  function logout () {
    currentUser = null;
    location.reload();
  }

  /* expose */
  w.userManager = { init, getUser, isLoggedIn, logout };
  /* auto-start after DOM ready */
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})(window);
