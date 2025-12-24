#!/bin/bash

# Set the project root directory
PROJECT_ROOT=$(pwd)

# Export Python path
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# Install dependencies (if needed)
pip install -r requirements.txt

# Run the FastAPI application
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
