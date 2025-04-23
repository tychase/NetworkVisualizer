/**
 * Data synchronization utilities for importing data from external APIs
 */

import { Request, Response } from 'express';
import { importAllFecData } from './fec-api';
import { db } from '../db';
import { pipelineRuns } from '../../shared/schema';

// Track pipeline runs in memory for status updates
const activePipelines: Record<string, any> = {};

/**
 * Generate a unique pipeline ID
 */
function generatePipelineId(type: string): string {
  return `${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * Create a new pipeline run record
 */
async function createPipelineRun(pipelineId: string, pipelineType: string) {
  try {
    await db.insert(pipelineRuns).values({
      id: pipelineId,
      pipelineType,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      createdAt: new Date()
    });
    
    // Also track in memory for faster access
    activePipelines[pipelineId] = {
      id: pipelineId,
      pipelineType,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString(),
      details: {}
    };
    
    return true;
  } catch (error) {
    console.error(`Error creating pipeline run record for ${pipelineId}:`, error);
    return false;
  }
}

/**
 * Update pipeline status
 */
async function updatePipelineStatus(
  pipelineId: string, 
  status: string, 
  progress: number, 
  details: any = {}
) {
  try {
    // Update in database
    await db.update(pipelineRuns)
      .set({
        status,
        progress,
        completionTime: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date(),
        details: JSON.stringify(details)
      })
      .where(eq(pipelineRuns.id, pipelineId));
    
    // Update in memory tracking
    if (activePipelines[pipelineId]) {
      activePipelines[pipelineId] = {
        ...activePipelines[pipelineId],
        status,
        progress,
        completionTime: status === 'completed' ? new Date().toISOString() : null,
        details
      };
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating pipeline status for ${pipelineId}:`, error);
    return false;
  }
}

/**
 * Import FEC data in the background
 */
export async function runFecDataImport(pipelineId: string, skipContributions = false) {
  try {
    // Update status to running with 0% progress
    await updatePipelineStatus(pipelineId, 'running', 0, {
      message: 'Starting FEC data import...'
    });
    
    // Start the import
    const result = await importAllFecData(skipContributions);
    
    if (result.success) {
      // Success
      await updatePipelineStatus(pipelineId, 'completed', 1, {
        message: 'FEC data import completed successfully',
        ...result
      });
    } else {
      // Failure
      await updatePipelineStatus(pipelineId, 'failed', 0, {
        message: 'FEC data import failed',
        error: result.message
      });
    }
    
    return result;
  } catch (error) {
    console.error(`Error in FEC data import (${pipelineId}):`, error);
    
    // Update status to failed
    await updatePipelineStatus(pipelineId, 'failed', 0, {
      message: 'FEC data import failed with an unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Import failed with error: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

/**
 * Handler for triggering the FEC data pipeline
 */
export async function handleTriggerFecPipeline(req: Request, res: Response) {
  try {
    const skipContributions = req.body.skipContributions === true;
    
    // Create pipeline ID and record
    const pipelineId = generatePipelineId('fec');
    const created = await createPipelineRun(pipelineId, 'fec');
    
    if (!created) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create pipeline run record'
      });
    }
    
    // Start the pipeline in the background
    setTimeout(async () => {
      await runFecDataImport(pipelineId, skipContributions);
    }, 0);
    
    return res.status(200).json({
      status: 'success',
      message: 'FEC data pipeline started successfully',
      pipelineId
    });
  } catch (error) {
    console.error('Error triggering FEC pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger FEC data pipeline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handler for retrieving pipeline status
 */
export async function handleGetPipelineStatus(req: Request, res: Response) {
  try {
    const pipelineId = req.params.id;
    
    // Check in-memory cache first for speed
    if (activePipelines[pipelineId]) {
      return res.status(200).json({
        status: activePipelines[pipelineId].status,
        message: `Pipeline ${activePipelines[pipelineId].pipelineType} is ${activePipelines[pipelineId].status}`,
        pipeline: activePipelines[pipelineId].pipelineType,
        progress: activePipelines[pipelineId].progress,
        startTime: activePipelines[pipelineId].startTime,
        completionTime: activePipelines[pipelineId].completionTime,
        details: activePipelines[pipelineId].details
      });
    }
    
    // If not in memory, check database
    const pipelineRun = await db.query.pipelineRuns.findFirst({
      where: eq(pipelineRuns.id, pipelineId)
    });
    
    if (!pipelineRun) {
      return res.status(404).json({
        status: 'error',
        message: `Pipeline run with ID ${pipelineId} not found`
      });
    }
    
    return res.status(200).json({
      status: pipelineRun.status,
      message: `Pipeline ${pipelineRun.pipelineType} is ${pipelineRun.status}`,
      pipeline: pipelineRun.pipelineType,
      progress: pipelineRun.progress,
      startTime: pipelineRun.startTime?.toISOString(),
      completionTime: pipelineRun.completionTime?.toISOString(),
      details: pipelineRun.details ? JSON.parse(pipelineRun.details) : {}
    });
  } catch (error) {
    console.error(`Error getting pipeline status for ${req.params.id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get pipeline status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Import Congress data in the background (placeholder for future implementation)
 */
export async function runCongressDataImport(pipelineId: string, congressNumber = 117, session = 1) {
  try {
    // Update status to running with 0% progress
    await updatePipelineStatus(pipelineId, 'running', 0, {
      message: 'Starting Congress data import...',
      congressNumber,
      session
    });
    
    // TODO: Implement actual Congress data import
    // For now, just simulate a running task
    
    // Wait for 5 seconds to simulate work
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Mark as completed
    await updatePipelineStatus(pipelineId, 'completed', 1, {
      message: 'Congress data import completed successfully',
      congressNumber,
      session,
      rowsProcessed: 0,
      rowsImported: 0
    });
    
    return {
      success: true,
      message: 'Congress data import completed'
    };
  } catch (error) {
    console.error(`Error in Congress data import (${pipelineId}):`, error);
    
    // Update status to failed
    await updatePipelineStatus(pipelineId, 'failed', 0, {
      message: 'Congress data import failed with an unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Import failed with error: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

/**
 * Handler for triggering the Congress data pipeline
 */
export async function handleTriggerCongressPipeline(req: Request, res: Response) {
  try {
    const congressNumber = parseInt(req.body.congressNumber || '117', 10);
    const session = parseInt(req.body.session || '1', 10);
    
    // Create pipeline ID and record
    const pipelineId = generatePipelineId('congress');
    const created = await createPipelineRun(pipelineId, 'congress');
    
    if (!created) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create pipeline run record'
      });
    }
    
    // Start the pipeline in the background
    setTimeout(async () => {
      await runCongressDataImport(pipelineId, congressNumber, session);
    }, 0);
    
    return res.status(200).json({
      status: 'success',
      message: 'Congress data pipeline started successfully',
      pipelineId
    });
  } catch (error) {
    console.error('Error triggering Congress pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger Congress data pipeline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Import Stock transaction data in the background (placeholder for future implementation)
 */
export async function runStockDataImport(pipelineId: string) {
  try {
    // Update status to running with 0% progress
    await updatePipelineStatus(pipelineId, 'running', 0, {
      message: 'Starting Stock transaction data import...'
    });
    
    // TODO: Implement actual Stock transaction data import
    // For now, just simulate a running task
    
    // Wait for 5 seconds to simulate work
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Mark as completed
    await updatePipelineStatus(pipelineId, 'completed', 1, {
      message: 'Stock transaction data import completed successfully',
      rowsProcessed: 0,
      rowsImported: 0
    });
    
    return {
      success: true,
      message: 'Stock transaction data import completed'
    };
  } catch (error) {
    console.error(`Error in Stock transaction data import (${pipelineId}):`, error);
    
    // Update status to failed
    await updatePipelineStatus(pipelineId, 'failed', 0, {
      message: 'Stock transaction data import failed with an unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Import failed with error: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

/**
 * Handler for triggering the Stock transaction data pipeline
 */
export async function handleTriggerStockPipeline(req: Request, res: Response) {
  try {
    // Create pipeline ID and record
    const pipelineId = generatePipelineId('stock');
    const created = await createPipelineRun(pipelineId, 'stock');
    
    if (!created) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create pipeline run record'
      });
    }
    
    // Start the pipeline in the background
    setTimeout(async () => {
      await runStockDataImport(pipelineId);
    }, 0);
    
    return res.status(200).json({
      status: 'success',
      message: 'Stock transaction data pipeline started successfully',
      pipelineId
    });
  } catch (error) {
    console.error('Error triggering Stock transaction pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger Stock transaction data pipeline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}