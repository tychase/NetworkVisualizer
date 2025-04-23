#!/bin/bash

# Export environment variables
export BACKEND_PORT=8000
export BACKEND_HOST="0.0.0.0"

# Check if database is available
python -c "from backend.database import test_connection; test_connection()"
if [ $? -ne 0 ]; then
    echo "Error: Database connection failed. Please check your database settings."
    exit 1
fi

# Start the FastAPI backend server
echo "Starting FastAPI backend server on port $BACKEND_PORT..."
python backend/start.py