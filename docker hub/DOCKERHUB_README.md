# YAML Parser - DockerHub Deployment

This guide explains how to run the YAML Parser application using pre-built images from DockerHub.

## Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose installed

### Option 1: Simple Setup (Recommended for most users)

1. Download the `docker-compose.hub.yml` file
2. Edit the volume mount path to point to your project directory:
   ```yaml
   volumes:
     - C:\Users\YOUR_USERNAME\Desktop\your-projects:/app/projects  # Windows
     # or
     - /home/username/projects:/app/projects                       # Linux/Mac
   ```
3. Run the application:
   ```bash
   docker-compose -f docker-compose.hub.yml up -d
   ```
4. Open your browser and go to `http://localhost:3000`
5. Use `/app/projects` as the directory path in the web interface

### Option 2: Production Setup with Environment Variables

1. Download both `docker-compose.prod.yml` and `.env` files
2. Edit the `.env` file to set your project directory:
   ```bash
   # Windows
   HOST_PROJECT_PATH=C:\Users\username\Desktop\my-projects
   
   # Linux/Mac  
   HOST_PROJECT_PATH=/home/username/projects
   ```
3. Run the application:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Available Images

- **Backend**: `bdutucu/yaml-parser-backend:latest`
  - Flask API for parsing YAML files and analyzing microservice dependencies
  - Exposes port 5000
  
- **Frontend**: `bdutucu/yaml-parser-frontend:latest`
  - React web interface for visualizing microservice relationships
  - Exposes port 3000

## Configuration

### Volume Mounting
The backend container needs access to your project files. Mount your project directory to `/app/projects`:

**Windows:**
```yaml
volumes:
  - C:\Users\username\Desktop\my-projects:/app/projects
```

**Linux/Mac:**
```yaml
volumes:
  - /home/username/projects:/app/projects
```

### Environment Variables
- `FLASK_ENV`: Set to `production` for production use
- `FLASK_DEBUG`: Set to `0` for production
- `CONTAINER_PROJECT_PATH`: Internal container path (default: `/app/projects`)

## Usage

1. Start the containers
2. Open `http://localhost:3000` in your browser
3. Enter `/app/projects` in the directory input field
4. Click "Get Relationship Graph" to analyze your microservices

### Directory Structure Expected
Your mounted directory should contain microservice projects with:
- `config/` directories with YAML configuration files
- `deployment/` directories with Kubernetes/Docker configurations
- Service definition files

## Commands

### Start the application
```bash
# Simple version
docker-compose -f docker-compose.hub.yml up -d

# Production version with environment variables
docker-compose -f docker-compose.prod.yml up -d
```

### Stop the application
```bash
docker-compose -f docker-compose.hub.yml down
# or
docker-compose -f docker-compose.prod.yml down
```

### View logs
```bash
# All services
docker-compose -f docker-compose.hub.yml logs

# Specific service
docker-compose -f docker-compose.hub.yml logs backend
docker-compose -f docker-compose.hub.yml logs frontend
```

### Update images
```bash
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

## Ports

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

## Troubleshooting

### Common Issues

1. **"Directory not found" error**
   - Check that your volume mount path is correct
   - Ensure the directory exists on your host system
   - Use forward slashes (/) in container paths

2. **Cannot access the application**
   - Verify containers are running: `docker ps`
   - Check logs: `docker-compose logs`
   - Ensure ports 3000 and 5000 are not used by other applications

3. **No microservices detected**
   - Verify your project directory contains `config/` or `deployment/` subdirectories
   - Check that YAML files exist in the expected locations

### Getting Help

- Check container logs for detailed error messages
- Verify your directory structure matches the expected format
- Ensure Docker has permission to access the mounted directory

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │    Backend       │
│   (Port 3000)   │────│   (Port 5000)    │
│   React/Nginx   │    │   Flask API      │
└─────────────────┘    └──────────────────┘
         │                       │
         └───────────────────────┘
                   │
            ┌─────────────┐
            │  Host       │
            │  Directory  │
            │  (Mounted)  │
            └─────────────┘
```

## Security Notes

- The application runs in production mode with debug disabled
- Health checks are enabled to monitor container status
- Containers restart automatically unless stopped manually
- Use specific image tags instead of `latest` for production deployments
