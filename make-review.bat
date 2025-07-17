@echo off
setlocal

:: -------------------------------------------------------------------
::  B) Define output filenames
:: -------------------------------------------------------------------
set "OUTPUT_FILE=ai-review.txt"
set "FILELIST=filelist.txt"

:: Clear the output file
> "%OUTPUT_FILE%" echo.

:: -------------------------------------------------------------------
::  C) Generate the file list with correct paths
:: -------------------------------------------------------------------
> "%FILELIST%" (

    rem echo .htaccess
    rem echo tables.txt
    echo public\js\c64Syntax.js  
    echo public\js\cartManager.js  
    echo public\js\commandManager.js
    echo public\js\emulatorManager.js
    echo public\js\gameManager.js
    echo public\js\productServices.js
    echo public\js\snipcartKeys.js
    echo public\js\themeManager.js
    echo public\js\uiManager.js
    echo public\js\uiConfig.js
    echo public\js\userManager.js
    echo public\js\googleauth.js
    echo public\auth.php
    echo public\c64\index.html
    echo public\collections_api.php
    echo public\index.html
    echo public\products_api.php
    rem echo public\snipcart_webhook.php
    echo public\css\style2.css


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