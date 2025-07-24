# YAML Microservice Relation Mapper

A web application for parsing YAML configuration files and visualizing microservice relations using graphs.

## Features

- **Reading from directory:** :Enter the project folder directory as input to get the results.

- **Logical Dependency Analysis**: Automatically detects and analyzes microservice relationships from YAML configurations

- **Interactive Visualization**:  dependency graphs using Mermaid.js with:
  - Automatic graph generation
  - Export functionality (PNG format)
  - Responsive design

- **Detailed Service Information**: View comprehensive details about each microservice including:
  - Topics produced
  - Topics subscribed to
  - Connection statistics

## Architecture

- **Backend**: Flask 
- **Frontend**: React
- **Visualization**: Mermaid.js for dependency graph generation
- **Deployment**: Docker (it is planned for later)
)

## Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Prerequisites**: Docker and Docker Compose installed

2. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

3. **Access the Application**:
   - Open your browser and go to `http://localhost`
   - The application will be ready to use!

### Local Development

#### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask server**:
   ```bash
   python app.py
   ```
   - Backend will be available at `http://localhost:5000`

#### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the React development server**:
   ```bash
   npm start
   ```
   - Frontend will be available at `http://localhost:3000`

## Usage

1. **Navigate to your project folder**:
   - make sure your folder consists "doc" and "deployment" folders.
   - inside of the /deployment there must be a subfolder named "config" where the producer topic info takes place.

2. **enter your outer project folder directory as input**:
   - 


## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/parse-directory` - Parse YAML files from uploaded ZIP directory
- `POST /api/parse-files` - Parse individual YAML files
- `POST /api/generate-mermaid` - Generate Mermaid.js diagram code



## YAML File Format

The application expects YAML files with specific patterns for microservice configuration:

### Configuration Files (deployment/config/)
```yaml
name: user-service
spring:
  # ... other configuration
consumers:
  topics:
    - ${topics.order.event}
    - ${topics.payment.event}
topics:
  user:
    event: com.example.user.UserCreated
```

### Documentation Files (doc/)
```yaml
# Service documentation
**topic:** 'com.example.user.UserCreated'
```

