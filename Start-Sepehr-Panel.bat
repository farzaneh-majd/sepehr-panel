@echo off
setlocal EnableExtensions
title Sepehr Panel Launcher
color 0B

cd /d "%~dp0"
set "APP_URL=http://localhost:3000"
set "WEB_PORT=3000"
set "NO_BROWSER=0"
set "SKIP_UPDATE=0"

if /I "%~1"=="--no-browser" set "NO_BROWSER=1"
if /I "%~1"=="--skip-update" set "SKIP_UPDATE=1"
if /I "%~2"=="--no-browser" set "NO_BROWSER=1"
if /I "%~2"=="--skip-update" set "SKIP_UPDATE=1"

echo.
echo ============================================================
echo                 Starting Sepehr Panel
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not installed or Docker is not in PATH.
    echo Install Docker Desktop, restart Windows, and run this file again.
    echo https://www.docker.com/products/docker-desktop/
    goto :failed
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [1/6] Docker Desktop is not running. Starting it now...
    set "DOCKER_DESKTOP=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" set "DOCKER_DESKTOP=%LocalAppData%\Docker\Docker Desktop.exe"

    if not exist "%DOCKER_DESKTOP%" (
        echo [ERROR] Docker Desktop was found in PATH, but its application could not be located.
        echo Please start Docker Desktop manually and run this file again.
        goto :failed
    )

    start "" "%DOCKER_DESKTOP%"
    echo       Waiting for Docker Desktop to become ready...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$limit=(Get-Date).AddMinutes(3); do { docker info *> $null; if ($LASTEXITCODE -eq 0) { exit 0 }; Start-Sleep -Seconds 3 } while ((Get-Date) -lt $limit); exit 1"
    if errorlevel 1 (
        echo [ERROR] Docker Desktop did not become ready within three minutes.
        goto :failed
    )
) else (
    echo [1/6] Docker Desktop is ready.
)

if not exist ".env" (
    echo [2/6] Creating the private local configuration...
    if not exist ".env.example" (
        echo [ERROR] .env.example is missing from this folder.
        goto :failed
    )

    powershell -NoProfile -ExecutionPolicy Bypass -Command "$text=Get-Content '.env.example' -Raw; $mysql=[guid]::NewGuid().ToString('N'); $root=[guid]::NewGuid().ToString('N'); $jwt=([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')); $admin=[guid]::NewGuid().ToString('N'); $one=[guid]::NewGuid().ToString('N'); $two=[guid]::NewGuid().ToString('N'); $text=$text -replace '(?m)^MYSQL_PASSWORD=.*$',('MYSQL_PASSWORD='+$mysql) -replace '(?m)^MYSQL_ROOT_PASSWORD=.*$',('MYSQL_ROOT_PASSWORD='+$root) -replace '(?m)^JWT_KEY=.*$',('JWT_KEY='+$jwt) -replace '(?m)^SEED_ADMIN_PASSWORD=.*$',('SEED_ADMIN_PASSWORD='+$admin) -replace '(?m)^SEED_USER_ONE_PASSWORD=.*$',('SEED_USER_ONE_PASSWORD='+$one) -replace '(?m)^SEED_USER_TWO_PASSWORD=.*$',('SEED_USER_TWO_PASSWORD='+$two) -replace '(?m)^SEED_TEAM_PASSWORD=.*$','SEED_TEAM_PASSWORD=123456789'; Set-Content '.env' $text -Encoding ASCII"
    if errorlevel 1 (
        echo [ERROR] The local configuration could not be created.
        goto :failed
    )
) else (
    echo [2/6] Existing local configuration found. It will be preserved.
)

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="WEB_PORT" set "WEB_PORT=%%B"
)
call :ensure_web_port
set "APP_URL=http://localhost:%WEB_PORT%"

if "%SKIP_UPDATE%"=="1" (
    echo [3/6] Update check skipped.
) else (
    where git >nul 2>&1
    if errorlevel 1 (
        echo [3/6] Git is not installed. Continuing with the downloaded version.
    ) else (
        if exist ".git" (
            echo [3/6] Checking GitHub for application updates...
            git pull --ff-only
            if errorlevel 1 echo [WARNING] Git update was not applied. Continuing with the current files.
        ) else (
            echo [3/6] This is not a Git checkout. Continuing with the downloaded version.
        )
    )
)

echo [4/6] Downloading the latest Sepehr Panel images...
docker compose pull
if errorlevel 1 (
    echo [WARNING] Image download failed. Trying locally cached images...
)

echo [5/6] Starting the database, backend, and website...
docker compose up -d --no-build
if errorlevel 1 (
    echo [ERROR] Sepehr Panel could not be started.
    echo.
    docker compose ps
    goto :failed
)

echo [6/6] Waiting for Sepehr Panel to become ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$api='http://localhost:5000/health'; $web='%APP_URL%'; $limit=(Get-Date).AddMinutes(3); do { try { $a=Invoke-WebRequest -UseBasicParsing -Uri $api -TimeoutSec 5; $w=Invoke-WebRequest -UseBasicParsing -Uri $web -TimeoutSec 5; if ($a.StatusCode -eq 200 -and $w.StatusCode -ge 200 -and $w.StatusCode -lt 500) { exit 0 } } catch {}; Start-Sleep -Seconds 3 } while ((Get-Date) -lt $limit); exit 1"
if errorlevel 1 (
    echo [ERROR] The containers started, but the application did not become ready.
    echo Run: docker compose logs --tail=100
    goto :failed
)

echo.
echo ============================================================
echo Sepehr Panel is ready: %APP_URL%
echo Your data is stored in the persistent local MySQL volume.
echo ============================================================
echo.

if "%NO_BROWSER%"=="1" goto :success

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%APP_URL%"
    goto :success
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%APP_URL%"
    goto :success
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%APP_URL%"
    goto :success
)

echo Google Chrome was not found. Opening the default browser instead.
start "" "%APP_URL%"

:success
echo You can close this window. Sepehr Panel will keep running.
ping 127.0.0.1 -n 6 >nul
exit /b 0

:failed
echo.
echo Startup was not completed. The database volume was not deleted.
echo Press any key to close this window.
pause >nul
exit /b 1

:ensure_web_port
set "WEB_CONTAINER_RUNNING="
for /f "delims=" %%I in ('docker compose ps --status running -q web 2^>nul') do set "WEB_CONTAINER_RUNNING=1"
if defined WEB_CONTAINER_RUNNING exit /b 0

set "AVAILABLE_WEB_PORT="
for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$busy=[System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port; $port=[int]$env:WEB_PORT; while ($busy -contains $port) { $port++ }; Write-Output $port"') do set "AVAILABLE_WEB_PORT=%%P"
if not defined AVAILABLE_WEB_PORT exit /b 0
if "%AVAILABLE_WEB_PORT%"=="%WEB_PORT%" exit /b 0

echo       Port %WEB_PORT% is already in use. Using port %AVAILABLE_WEB_PORT% instead.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$text=Get-Content '.env' -Raw; $text=$text -replace '(?m)^WEB_PORT=.*$',('WEB_PORT='+$env:AVAILABLE_WEB_PORT) -replace '(?m)^WEB_ORIGIN=.*$',('WEB_ORIGIN=http://localhost:'+$env:AVAILABLE_WEB_PORT); Set-Content '.env' $text -Encoding ASCII"
if errorlevel 1 exit /b 0
set "WEB_PORT=%AVAILABLE_WEB_PORT%"
exit /b 0
