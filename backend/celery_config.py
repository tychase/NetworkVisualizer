"""
Celery configuration settings
"""
import os
from datetime import timedelta

# General Celery settings
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'
enable_utc = True
timezone = 'UTC'

# Task execution settings
task_acks_late = True
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1

# Result backend settings
result_expires = 60 * 60 * 24  # 1 day

# Queue configuration
task_default_queue = 'default'
task_queues = {
    'default': {'exchange': 'default', 'routing_key': 'default'},
    'pdf_processing': {'exchange': 'pdf_processing', 'routing_key': 'pdf_processing'},
    'data_pipeline': {'exchange': 'data_pipeline', 'routing_key': 'data_pipeline'},
}

# Task routing
task_routes = {
    'backend.tasks.pdf_ocr_tasks.*': {'queue': 'pdf_processing'},
    'backend.tasks.data_pipeline_tasks.*': {'queue': 'data_pipeline'},
}

# Periodic tasks
beat_schedule = {
    'run-fec-pipeline-daily': {
        'task': 'backend.tasks.data_pipeline_tasks.run_fec_pipeline_task',
        'schedule': timedelta(days=1),
        'options': {'queue': 'data_pipeline'},
    },
    'run-congress-pipeline-daily': {
        'task': 'backend.tasks.data_pipeline_tasks.run_congress_pipeline_task',
        'schedule': timedelta(days=1),
        'options': {'queue': 'data_pipeline'},
    },
    'run-stock-pipeline-daily': {
        'task': 'backend.tasks.data_pipeline_tasks.run_stock_pipeline_task',
        'schedule': timedelta(days=1),
        'options': {'queue': 'data_pipeline'},
    },
}