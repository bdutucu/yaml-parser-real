#!/bin/bash

# YAML Parser - Quick Deploy Script for Linux/Mac
# This script deploys the YAML Parser using DockerHub images

echo "================================================"
echo "YAML Parser - DockerHub Deployment"
echo "================================================"
echo

# Check if Docker is running
if ! docker version >/dev/null 2>&1; then
    echo "ERROR: Docker is not running or not installed."
    echo "Please start Docker and try again."
    exit 1
fi

echo "Docker is running..."
echo

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo "ERROR: docker-compose is not available."
    echo "Please install Docker Compose and try again."
    exit 1
fi

echo "Docker Compose is available..."
echo

# Pull the latest images
echo "Pulling latest images from DockerHub..."
if ! docker-compose -f docker-compose.hub.yml pull; then
    echo "ERROR: Failed to pull images from DockerHub."
    echo "Please check your internet connection and try again."
    exit 1
fi

echo
echo "Images pulled successfully!"
echo

# Start the containers
echo "Starting containers..."
if ! docker-compose -f docker-compose.hub.yml up -d; then
    echo "ERROR: Failed to start containers."
    echo "Please check the logs and try again."
    exit 1
fi

echo
echo "================================================"
echo "DEPLOYMENT SUCCESSFUL!"
echo "================================================"
echo
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo
echo "IMPORTANT: In the web interface, use '/app/projects' as the directory path"
echo
echo "To stop the application, run: docker-compose -f docker-compose.hub.yml down"
echo

# Try to open the web interface (works on most Linux distributions with GUI)
if command -v xdg-open >/dev/null 2>&1; then
    echo "Opening web interface..."
    xdg-open http://localhost:3000 >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    # macOS
    echo "Opening web interface..."
    open http://localhost:3000
else
    echo "Please open http://localhost:3000 in your web browser"
fi

echo
echo "Script completed!"
