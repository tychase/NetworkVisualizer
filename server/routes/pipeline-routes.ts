/**
 * Routes for data pipeline operations
 */
import { Router } from 'express';
import { checkPipelineBackendStatus } from '../api/pipelines';
import {
  handleTriggerFecPipeline,
  handleTriggerCongressPipeline,
  handleTriggerStockPipeline,
  handleGetPipelineStatus
} from '../api/data-sync';

const router = Router();

// Check if the pipeline backend is running
router.get('/status', checkPipelineBackendStatus);

// Trigger different pipelines with real FEC API implementation
router.post('/fec', handleTriggerFecPipeline);
router.post('/congress', handleTriggerCongressPipeline);
router.post('/stock', handleTriggerStockPipeline);

// Get status of a specific pipeline run
router.get('/:id/status', handleGetPipelineStatus);

export default router;