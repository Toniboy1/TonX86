@echo off
REM Quick verification script to test that all packages build correctly

echo.
echo 0x86 TonX86 Foundation Build Verification
echo ==========================================
echo.

cd /d "%~dp0"

REM Test 1: Check node_modules
echo Checking dependencies...
if exist "node_modules" (
    echo [OK] node_modules found
) else (
    echo [FAILED] node_modules not found - run 'npm install'
    exit /b 1
)

REM Test 2: Build all packages
echo.
echo Building packages...
call npm run build > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] All packages compiled successfully
) else (
    echo [FAILED] Build failed
    exit /b 1
)

REM Test 3: Check build outputs
echo.
echo Checking build outputs...

set all_exist=1
for %%f in (
    "packages\extension\out\extension.js"
    "packages\debug-adapter\out\debugAdapter.js"
    "packages\language-server\out\server.js"
    "packages\simcore\out\simulator.js"
) do (
    if exist %%f (
        echo [OK] %%f
    ) else (
        echo [FAILED] %%f not found
        set all_exist=0
    )
)

echo.
if %all_exist% equ 1 (
    echo ================================================
    echo [SUCCESS] Foundation build verified!
    echo ================================================
    echo.
    echo Next steps:
    echo   * npm run watch   - Watch mode for development
    echo   * npm run lint    - Run code linter
    echo   * See README.md for usage instructions
    exit /b 0
) else (
    echo [FAILED] Build verification failed
    exit /b 1
)
