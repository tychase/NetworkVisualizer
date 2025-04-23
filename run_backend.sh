#!/bin/bash
# Script to run the FastAPI backend service

# Kill any existing Python processes running on port 8000
pkill -f "python.*data_pipeline_api.py" || true

# Clear the log file
> pipeline_api.log

echo "Starting FastAPI backend service on port 8000..."

# Start the FastAPI server in the foreground
python3 data_pipeline_api.py &

# Save the PID
PID=$!
echo "Backend service started with PID: $PID"

# Wait for server to start (up to 10 seconds)
MAX_TRIES=10
COUNT=0
while [ $COUNT -lt $MAX_TRIES ]; do
  sleep 1
  if grep -q "Uvicorn running on http://0.0.0.0:8000" pipeline_api.log; then
    echo "Backend service is up and running!"
    tail -n 10 pipeline_api.log
    exit 0
  fi
  ((COUNT++))
  echo "Waiting for server to start... ($COUNT/$MAX_TRIES)"
done

echo "Backend service failed to start properly. Check pipeline_api.log for details:"
cat pipeline_api.log
exit 1