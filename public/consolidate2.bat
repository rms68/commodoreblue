@echo off
setlocal

:: -------------------------------------------------------------------
::  B) Define output filenames
:: -------------------------------------------------------------------
set "OUTPUT_FILE=consolidated.txt"
set "FILELIST=filelist.txt"

:: Clear the output file
> "%OUTPUT_FILE%" echo.

:: -------------------------------------------------------------------
::  C) Generate the file list with correct paths
:: -------------------------------------------------------------------
> "%FILELIST%" (

    rem echo .htaccess
    rem echo tables.txt
    rem echo public\js\c64Syntax.js  
    rem echo public\js\cartManager.js  
    echo public\js\commandManager.js
    echo public\js\emulatorManager.js
    echo public\js\gameManager.js
    rem echo public\js\productServices.js
    rem echo public\js\snipcartKeys.js
    echo public\js\uiManager.js
    echo public\js\themeManager.js
    rem echo public\js\userManager.js
    rem echo public\js\googleauth.js
    rem echo public\js\ViewRenderer.js
    rem echo public\js\displayManager.js
    rem echo public\emulator\jcs64.html
    rem echo public\auth.php
    rem echo public\user_api.php
    rem echo public\logout.php
    rem echo public\login.php
    rem echo public\authCallback.php
    rem echo public\google_auth_handler.php
    rem echo public\c64\tictactoe.html


    rem echo directus-docker\docker-compose.yml

    rem echo public\admin.yaml

    
    
    rem echo public\js\userManager.js
    rem echo public\Token.txt
    rem echo public\collections_api.php
    rem echo config_directus.php
    rem echo public\config.php
    rem echo public\directus_proxy.php
    rem echo public\config.php
    echo public\index.html
    rem echo public\login.php
    rem echo public\logout.php
    rem echo public\products_api.php
    rem echo public\snipcart_webhook.php
    rem echo public\css\style.css
    rem echo public\user_api.php

)

:: Process each file
for /f "usebackq delims=" %%F in ("%FILELIST%") do (
    if exist "%%F" (
        (
            echo ==============================
            echo Path: %%F
            echo ==============================
            type "%%F"
            echo.
            echo.
        ) >> "%OUTPUT_FILE%"
    ) else (
        echo File not found: %%F >> "%OUTPUT_FILE%"
    )
)

:: Clean up and finish
del "%FILELIST%"
echo Consolidation complete. The result is saved in "%OUTPUT_FILE%"
pause
endlocal