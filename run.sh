#!/bin/bash

# Set the Python path to include the backend directory
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Run the FastAPI app from the backend directory
cd backend && uvicorn main:app --reload --port 8000 --log-level debug
