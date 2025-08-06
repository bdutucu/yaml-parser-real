@echo off
REM YAML Parser - Quick Deploy Script for Windows
REM This script deploys the YAML Parser using DockerHub images

echo ================================================
echo YAML Parser - DockerHub Deployment
echo ================================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not available.
    echo Please install Docker Compose and try again.
    pause
    exit /b 1
)

echo Docker Compose is available...
echo.

REM Pull the latest images
echo Pulling latest images from DockerHub...
docker-compose -f docker-compose.hub.yml pull

if %errorlevel% neq 0 (
    echo ERROR: Failed to pull images from DockerHub.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Images pulled successfully!
echo.

REM Start the containers
echo Starting containers...
docker-compose -f docker-compose.hub.yml up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start containers.
    echo Please check the logs and try again.
    pause
    exit /b 1
)

echo.
echo ================================================
echo DEPLOYMENT SUCCESSFUL!
echo ================================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo IMPORTANT: In the web interface, use '/app/projects' as the directory path
echo.
echo To stop the application, run: docker-compose -f docker-compose.hub.yml down
echo.
echo Press any key to open the web interface...
pause >nul

REM Try to open the web interface
start http://localhost:3000

echo.
echo Script completed!
pause
