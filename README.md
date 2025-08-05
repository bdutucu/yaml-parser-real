# YAML Microservice Relation Mapper

A web application for parsing YAML configuration files and visualizing microservice relations using graphs.

## Features

- **Reading from directory:** Enter the project folder directory as input to get the results.

- **Logical Dependency Analysis**: Automatically detects and analyzes microservice relationships from YAML configurations

- **Interactive Visualization**: dependency graphs using Mermaid.js with:
  - Automatic graph generation
  - Export functionality (PNG format)
  - Responsive design

- **Detailed Service Information**: View comprehensive details about each microservice including:
  - Topics produced
  - Topics subscribed to
  - Connection statistics

## Architecture

- **Backend**: Flask 
- **Frontend**: React with Vite
- **Visualization**: Mermaid.js for dependency graph generation
- **Deployment**: Docker (it is planned for later)

## Quick Start

### Prerequisites

Before setting up the project, ensure you have the following installed:

#### Required Software

1. **Python** (tested with Python 3.13.5)
   - Download from [python.org](https://www.python.org/downloads/)
   - During installation, make sure to check "Add Python to PATH"
   - **Verify installation**: Open terminal/command prompt and run:
     ```bash
     python --version
     ```

2. **Node.js with npm** 
     - Node.js: `v18.0.0` or higher (Vite requirement)
     - npm: `9.0.0` or higher 
   - **Verify installation**: Open terminal/command prompt and run:
     ```bash
     node --version
     npm --version
     ```

3. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)
   - **Verify installation**:
     ```bash
     git --version
     ```

#### IMPORTANT: Version Verification

**Before proceeding, you MUST verify all versions are correct:**

```bash
# Run these commands and check the output matches the requirements:
python --version    # Should show Python 3.8.0 or higher
node --version      # Should show v18.0.0 or higher (Vite requirement)
npm --version       # Should show 9.0.0 or higher
git --version       # Should show git version 2.x.x or higher
```

**If any command fails or shows an older version, stop here and install/update the required software before continuing.**

### First-Time Setup

**CRITICAL: Follow these steps EXACTLY in order. Do not skip any step.**

If you're setting up this project for the first time, follow these steps:

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd yaml-parser-real
```

**Verify**: You should now be in the `yaml-parser-real` directory. Run `dir` (Windows) or `ls` (Mac/Linux) to see folders like `backend`, `frontend`, `test`, etc.

#### 2. Backend Setup (Python/Flask)

1. **Navigate to backend directory**:
   
   ```bash
   cd backend
   ```

2. **Create a virtual environment** (STRONGLY RECOMMENDED):
   
   ```bash
   # Create virtual environment
   python -m venv venv
   ```
   
   **Verify**: A new `venv` folder should appear in the backend directory.

3. **Activate virtual environment**:
   
   ```bash
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```
   
   **Verify**: Your command prompt should now show `(venv)` at the beginning.

4. **Install Python dependencies**:
   
   ```bash
   pip install -r requirements.txt
   ```
   
   **Expected output**: You should see installation messages for Flask, Flask-CORS, and Werkzeug.

5. **Test the Flask server**:
   
   ```bash
   python app.py
   ```
   
   **Expected output**: `Running on http://127.0.0.1:5000` or similar
   
   **Verify**: Open browser to `http://localhost:5000/health` - you should see a health check response.
   
   **Important**: Keep this terminal window open and running.

#### 3. Frontend Setup (React/Vite)

**⚠️ Open a NEW terminal window/tab for the frontend setup.**

1. **Navigate to frontend directory from the project root**:
   
   ```bash
   cd frontend
   ```
   
   **Note**: If you're not in the project root, navigate there first: `cd path/to/yaml-parser-real`

2. **Install Node.js dependencies**:
   
   ```bash
   npm install
   ```
   
   **Expected output**: npm will download and install packages. This may take 2-5 minutes.
   
   **Verify**: A `node_modules` folder should appear in the frontend directory.

3. **Start the Vite development server**:
   
   ```bash
   npm run dev
   ```
   
   **Expected output**: 
   ```
   VITE v4.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```
   
   **Verify**: Open your browser to `http://localhost:5173` showing the YAML Parser interface.

#### 4. Final Verification

**Both servers should now be running:**
- Backend: `http://localhost:5000` 
- Frontend: `http://localhost:5173` (Vite default port)

**Test the complete setup:**
1. Go to `http://localhost:5173`
2. You should see the YAML Microservice Relation Mapper interface
3. If you see any errors, check the troubleshooting section below

### Local Development (For Subsequent Runs)

If you've already set up the project and just want to run it:

#### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Activate virtual environment** (if using one):
   ```bash
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
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

2. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   - Frontend will be available at `http://localhost:5173`

### Bonus:

Use yaml-parser-run.bat if you dont want to type these commands every time.

### Dependencies Used

#### Backend (Python)

- **Flask**: 2.3.3 - Web framework
- **Flask-CORS**: 4.0.0 - Cross-Origin Resource Sharing support
- **Werkzeug**: 2.3.7 - WSGI utility library

#### Frontend (Node.js/React/Vite)

- **React**: ^18.2.0 - Frontend framework
- **Vite**: ^4.4.0 - Fast build tool and development server
- **Axios**: ^1.4.0 - HTTP client for API calls
- **Mermaid**: ^10.2.4 - Diagram and chart library
- **HTML2Canvas**: ^1.4.1 - Screenshot generation

### Troubleshooting

#### Version Verification Commands

**Run these commands to verify your setup:**

```bash
# Check Python version (must be 3.8+)
python --version
# Expected: Python 3.8.0 or higher (Python 3.13.5 used)

# Check Node.js version (must be 18+ for Vite)
node --version  
# Expected: v18.0.0 or higher (e.g., v20.16.0)

# Check npm version (must be 9+)
npm --version
# Expected: 9.0.0 or higher (e.g., 9.6.7)

# Check if pip is working
pip --version
# Expected: pip 21.0 or higher

# Check if virtual environment is active (should show (venv) in prompt)
# If in virtual environment, this should show the venv Python:
python -c "import sys; print(sys.executable)"
```

#### Common Issues and Solutions

1. **"python is not recognized" or "command not found"**
   - **Solution**: Python is not in your PATH. Reinstall Python and check "Add Python to PATH"
   - **Windows**: Add Python to PATH manually in System Environment Variables
   - **Verify fix**: Close terminal, open new one, run `python --version`

2. **"node is not recognized" or "npm not found"**
   - **Solution**: Node.js/npm not properly installed or not in PATH
   - **Fix**: Download and reinstall Node.js v18+ LTS from nodejs.org
   - **Verify fix**: Close terminal, open new one, run `node --version` and `npm --version`

3. **Virtual environment activation fails on Windows**
   - **Error**: "Execution of scripts is disabled on this system"
   - **Solution**: Run PowerShell as Administrator and execute:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
   - **Alternative**: Use Command Prompt instead of PowerShell

4. **npm install fails with permission errors**
   - **Solution**: Run terminal as Administrator (Windows) or use `sudo` (Mac/Linux)
   - **Alternative**: Use `npm install --no-optional` if regular install fails

5. **Port already in use errors**
   - **Backend (port 5000)**: 
     - Kill process: `taskkill /f /im python.exe` (Windows) or `pkill python` (Mac/Linux)
     - Or change port in `backend/app.py`: modify `app.run(port=5001)`
   - **Frontend (port 5173)**: 
     - Vite will automatically suggest alternative port (usually 5174)
     - Type `y` when prompted to use different port
     - Or manually specify port: `npm run dev -- --port 3000`

6. **Flask server starts but shows errors**
   - **Check**: Virtual environment is activated (you should see `(venv)` in prompt)
   - **Check**: All dependencies installed: `pip list` should show Flask, Flask-CORS, Werkzeug
   - **Reinstall**: `pip install -r requirements.txt --force-reinstall`

7. **Vite/React app shows blank page or errors**
   - **Check**: Backend is running on port 5000
   - **Check**: No console errors in browser developer tools (F12)
   - **Restart**: Stop Vite server (Ctrl+C) and run `npm run dev` again
   - **Clear cache**: Delete `node_modules` and `dist` folder, run `npm install` again
   - **Check Vite config**: Ensure `vite.config.js` has correct proxy settings for backend

8. **Vite-specific issues**
   - **Hot reload not working**: Check if your files are being watched correctly
   - **Import errors**: Ensure all imports use correct file extensions (.jsx for React components)
   - **Build errors**: Run `npm run build` to check for production build issues

#### Emergency Reset Commands

If everything fails, use these commands to start fresh:

```bash
# Backend reset
cd backend
# Delete virtual environment
rmdir /s venv        # Windows
rm -rf venv          # Mac/Linux

# Recreate everything
python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate # Mac/Linux
pip install -r requirements.txt

# Frontend reset  
cd frontend
rmdir /s node_modules    # Windows
rm -rf node_modules      # Mac/Linux
rmdir /s dist           # Windows (Vite build output)
rm -rf dist             # Mac/Linux (Vite build output)
npm install
```

## Usage

1. **Start both servers** (backend and frontend) as described in the setup sections above

2. **Navigate to the web application** at `http://localhost:5173`

3. **Prepare your project folder**:
   - Ensure your folder contains both "doc" and "deployment" folders

4. **View results**:
   - Explore the dependency graph
   - View detailed microservice information
   - Export diagrams as needed

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /parse` - Parse YAML files from directory path
- `POST /generate-mermaid` - Generate Mermaid.js diagram code

## YAML File Format

The application expects YAML files with specific patterns for microservice configuration:

### Configuration Files (deployment/config/)

```yaml
spring:
  application:
    name: user-service
  kafka:
    bootstrap-servers: localhost:9092

topics:
  user:
    event: ecommerce.user.event
  payment:
    event: ecommerce.payment.event

consumers:
  mainConsumer:
    topics:
      - ${topics.user.event}
      - ${topics.payment.event}
```

### Documentation Files (doc/)

```yaml
# Service documentation with topic definitions
paths:
  /user-events:
    post:
      tags:
        - DomainEvent
      description: User domain events
      
**Topic:** `ecommerce.user.event`
```
