#!/bin/bash

# Start Redis server in the background
redis-server --daemonize yes --port 6379

# Set environment variable
export REDIS_URL="redis://localhost:6379/0"
echo "Redis server started on port 6379"
echo "REDIS_URL set to redis://localhost:6379/0"