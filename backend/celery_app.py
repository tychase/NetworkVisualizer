"""
Celery configuration for background tasks
"""
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('CELERY_BROKER_URL', os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
os.environ.setdefault('CELERY_RESULT_BACKEND', os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))

# Create the Celery app
app = Celery('political_data_pipeline',
             broker=os.environ.get('CELERY_BROKER_URL'),
             backend=os.environ.get('CELERY_RESULT_BACKEND'))

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('backend.celery_config')

# Load task modules from all registered modules
app.autodiscover_tasks(['backend.tasks'])

if __name__ == '__main__':
    app.start()