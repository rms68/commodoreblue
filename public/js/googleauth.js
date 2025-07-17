"use strict";

// Google login logic
function googleLogin() {
  const auth2 = gapi.auth2.getAuthInstance();
  
  auth2.signIn().then(function(googleUser) {
    const profile = googleUser.getBasicProfile();
    const googleIdToken = googleUser.getAuthResponse().id_token;
    
    // Send the token to your server
    fetch('google_auth_handler.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_token: googleIdToken,
        email: profile.getEmail(),
        google_id: profile.getId()
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = "index.html";
      } else {
        alert('Error logging in: ' + (data.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error("Google login error: ", error);
    });
  }).catch(function(error) {
    console.error("Google Sign-In error:", error);
  });
}

// Function to initialize Google API
function initGoogleAuth() {
  gapi.load('auth2', function() {
    gapi.auth2.init({
      client_id: '726623760786-03730ph0ed7ora8cdp3fnavkctj87dmt.apps.googleusercontent.com'
    }).then(function() {
      console.log("Google Auth initialized successfully");
    }, function(error) {
      console.error("Google Auth initialization error:", error);
    });
  });
}

// You can call this function when Google Login is triggered via CLI
function googleLoginRedirect() {
  // For CLI-triggered login, we'll redirect to the PHP endpoint
  // which will handle the OAuth flow on the server side
  window.location.href = "google_redirect.php";
}

// Initialize Google Auth when the script loads
if (typeof gapi !== 'undefined') {
  initGoogleAuth();
} else {
  // If Google API is not loaded yet, wait for the window to load
  window.addEventListener('load', function() {
    if (typeof gapi !== 'undefined') {
      initGoogleAuth();
    } else {
      console.error("Google API (gapi) is not available");
    }
  });
}