/**
 * Mock data pipeline implementation for when the Python backend is not available
 * This provides a minimal implementation that allows the frontend to function
 */
import { randomUUID } from 'crypto';

// In-memory storage for pipeline runs
const pipelineRuns = new Map();

// Background pipeline task simulator
function simulatePipelineTask(pipelineId, pipelineType) {
  // Set initial status
  pipelineRuns.set(pipelineId, {
    status: 'running',
    progress: 0,
    startTime: new Date().toISOString(),
    completionTime: null,
    pipeline: pipelineType,
    details: {}
  });
  
  // Simulate progress over time (10 seconds total)
  const totalSteps = 10;
  let currentStep = 0;
  
  const interval = setInterval(() => {
    currentStep++;
    const progress = currentStep / totalSteps;
    
    const run = pipelineRuns.get(pipelineId);
    run.progress = progress;
    
    // Complete the task after all steps
    if (currentStep >= totalSteps) {
      clearInterval(interval);
      run.status = 'completed';
      run.completionTime = new Date().toISOString();
      run.details = {
        rowsProcessed: Math.floor(Math.random() * 900) + 100,
        rowsInserted: Math.floor(Math.random() * 450) + 50
      };
    }
    
    pipelineRuns.set(pipelineId, run);
  }, 1000);
}

// Trigger a mock FEC pipeline run
export function mockTriggerFecPipeline() {
  const pipelineId = `fec_${Date.now()}_${randomUUID().substring(0, 8)}`;
  
  // Start the pipeline in the background
  setTimeout(() => {
    simulatePipelineTask(pipelineId, 'fec');
  }, 0);
  
  return {
    pipelineId,
    status: 'started',
    message: 'FEC data pipeline started successfully'
  };
}

// Trigger a mock Congress pipeline run
export function mockTriggerCongressPipeline(congressNumber = 117, session = 1) {
  const pipelineId = `congress_${Date.now()}_${randomUUID().substring(0, 8)}`;
  
  // Start the pipeline in the background
  setTimeout(() => {
    simulatePipelineTask(pipelineId, 'congress');
  }, 0);
  
  return {
    pipelineId,
    status: 'started',
    message: 'Congress data pipeline started successfully',
    params: { congressNumber, session }
  };
}

// Trigger a mock stock pipeline run
export function mockTriggerStockPipeline() {
  const pipelineId = `stock_${Date.now()}_${randomUUID().substring(0, 8)}`;
  
  // Start the pipeline in the background
  setTimeout(() => {
    simulatePipelineTask(pipelineId, 'stock');
  }, 0);
  
  return {
    pipelineId,
    status: 'started',
    message: 'Stock transaction data pipeline started successfully'
  };
}

// Get the status of a pipeline run
export function mockGetPipelineStatus(pipelineId) {
  const run = pipelineRuns.get(pipelineId);
  
  if (!run) {
    return {
      status: 'error',
      message: `Pipeline run with ID ${pipelineId} not found`
    };
  }
  
  return {
    status: run.status,
    message: `Pipeline ${run.pipeline} is ${run.status}`,
    pipeline: run.pipeline,
    progress: run.progress,
    startTime: run.startTime,
    completionTime: run.completionTime,
    details: run.details
  };
}