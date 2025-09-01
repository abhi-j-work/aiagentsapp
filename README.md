# Entegris Research Agent (React/Python Version)

This project is a web application that extracts knowledge graphs from scientific documents using an LLM-powered agent. It has been converted from a single Streamlit application into a robust client-server architecture with a Python/FastAPI backend and a React/TypeScript frontend.

-   **Backend**: A FastAPI server that exposes an API for processing text and PDF files to generate graph data, extract insights, and suggest experiments.
-   **Frontend**: A React single-page application that provides a rich user interface for uploading documents, visualizing the interactive knowledge graph, and exploring the generated insights.

## Prerequisites

Before you begin, ensure you have the following installed:
-   **Python**: Version 3.9 or higher.
-   **Node.js**: Version 18 or higher, along with `npm`.

## Setup and Installation

Follow these steps to get the application running on your local machine. You will need two separate terminal windows: one for the backend and one for the frontend.

### 1. Backend Setup (FastAPI Server)

First, set up and run the Python backend.

**Terminal 1:**
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
.\venv\Scripts\activate

# 3. Install the required Python packages
pip install -r requirements.txt

# 4. Create an environment file
# Create a new file named .env in the `backend` directory
# and add your Groq API key to it:
# GROQ_API_KEY="gsk_YourSecretKeyHere"

# 5. Run the FastAPI server
# The --reload flag will automatically restart the server on code changes.
uvicorn app.main:app --reload
```
The backend server should now be running at `http://127.0.0.1:8000`. You can access the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup (React App)

Next, set up and run the React frontend in a separate terminal.

**Terminal 2:**
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install the required npm packages
npm install

# 3. Run the Vite development server
npm run dev
```
The React development server should now be running. It will typically open a new browser tab automatically, or you can access it at `http://localhost:5173`.

## How to Use the Application

Once both servers are running, open your web browser and navigate to the frontend URL (`http://localhost:5173`).

1.  Use the "Paste text" or "Upload (.txt/.pdf)" options to provide a document.
2.  Click **Generate Knowledge Graph**. The application will communicate with the backend to process the document.
3.  Once the graph appears, you can optionally click **Find Exceptional Insights** to perform a deeper analysis.
4.  If insights are found, you can explore the discovered paths and generate a suggested experiment.
5.  Interact with the graph by panning, zooming, and clicking on nodes. Click on a path in the insight panel to highlight it in the graph.
