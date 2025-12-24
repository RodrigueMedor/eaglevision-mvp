import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add the backend directory to the Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    # Run the FastAPI app
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
