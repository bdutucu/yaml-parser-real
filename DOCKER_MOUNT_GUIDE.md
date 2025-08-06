# Docker Configuration Guide

## Configuring the Project Directory Mount

The YAML Parser application needs access to your project files to analyze microservice dependencies. You can configure which directory from your host machine gets mounted into the Docker container.

### Method 1: Using .env file (Recommended)

1. Edit the `.env` file in the project root
2. Change the `HOST_PROJECT_PATH` variable to point to your desired directory:

```bash
# Examples for different operating systems:

# Windows
HOST_PROJECT_PATH=C:\Users\username\Desktop\my-projects

# Linux
HOST_PROJECT_PATH=/home/username/projects

# macOS
HOST_PROJECT_PATH=/Users/username/Documents/projects

# To mount your entire Desktop (Windows)
HOST_PROJECT_PATH=C:\Users\username\Desktop

# To mount a specific project directory
HOST_PROJECT_PATH=C:\Users\username\Desktop\my-microservices-project
```

### Method 2: Using environment variables

Set the environment variable before running docker-compose:

```bash
# Windows PowerShell
$env:HOST_PROJECT_PATH="C:\Users\username\Desktop\my-projects"
docker-compose up

# Windows Command Prompt
set HOST_PROJECT_PATH=C:\Users\username\Desktop\my-projects
docker-compose up

# Linux/macOS
export HOST_PROJECT_PATH="/home/username/projects"
docker-compose up
```

### Method 3: Direct docker-compose.yml modification

Edit the `docker-compose.yml` file and change the volume mount directly:

```yaml
volumes:
  - ./backend:/app
  - "C:\Users\username\Desktop\my-projects:/app/projects"  # Change this path
```

## How to Use

1. Configure your mount point using one of the methods above
2. Start the containers: `docker-compose up`
3. Open the frontend at http://localhost:3000
4. Use `/app/projects` as the base path in the web interface
5. For subdirectories, use `/app/projects/subdirectory-name`

## Examples

If you mounted `C:\Users\user\Desktop\microservices-project`, then:
- To analyze the entire mounted directory: `/app/projects`
- To analyze a subdirectory: `/app/projects/service1`
- To analyze a specific config folder: `/app/projects/service1/config`

## Important Notes

- The path in the web interface should always start with `/app/projects`
- Make sure the directory you're mounting exists on your host machine
- The application looks for `config/` and `deployment/` subdirectories
- Restart the containers after changing the mount point configuration
