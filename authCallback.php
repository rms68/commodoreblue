<?php
// authCallback.php - Google OAuth callback handler

require_once 'auth.php';

// Check if we have a code from Google
if (isset($_GET['code'])) {
    $authCode = $_GET['code'];
    
    if (handleGoogleLogin($authCode)) {
        // Successful login, redirect to home page
        header('Location: index.html');
        exit;
    } else {
        // Failed login
        header('Location: login.php?error=google_auth_failed');
        exit;
    }
} else {
    // No auth code received
    header('Location: login.php?error=no_auth_code');
    exit;
}