# Voice AI Agent for Telephonic Screening

A web app that simulates an AI-powered voice screening agent for job candidates.

## Features
- Animated, modern UI
- Voice or text input for candidate answers
- Real-time transcript display
- Sentiment and keyword analysis (mocked)
- Feedback cards for each candidate

## Tech Stack
- Frontend: React, TailwindCSS, Framer Motion
- Backend: FastAPI (Python)

## Getting Started

### 1. Backend
- Create a Python virtual environment
- Install dependencies:
  ```sh
  pip install -r backend/requirements.txt
  ```
- Start the backend:
  ```sh
  uvicorn backend.main:app --reload
  ```

### 2. Frontend
- Go to the `frontend` folder
- Install dependencies:
  ```sh
  npm install
  ```
- Start the frontend:
  ```sh
  npm run dev
  ```
- Open your browser at [http://localhost:5173](http://localhost:5173)
