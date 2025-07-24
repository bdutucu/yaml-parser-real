@echo off
REM Setup script for YAML Parser Web Application (Windows)

echo 🚀 Setting up YAML Parser Web Application...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Create necessary directories
echo 📁 Creating directories...
if not exist "backend\uploads" mkdir "backend\uploads"
if not exist "frontend\build" mkdir "frontend\build"

REM Build and start the application
echo 🏗️  Building and starting the application...
docker-compose up --build -d

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check if services are running
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo ✅ Application is running successfully!
    echo.
    echo 🌐 Access the application at: http://localhost
    echo 🔧 Backend API available at: http://localhost:5000
    echo.
    echo To stop the application: docker-compose down
    echo To view logs: docker-compose logs -f
) else (
    echo ❌ Something went wrong. Check the logs with: docker-compose logs
)

pause
