/**
 * Routes for data pipeline operations
 */
import { Router } from 'express';
import {
  triggerFecPipeline,
  triggerCongressPipeline,
  triggerStockPipeline,
  getPipelineStatus,
  checkPipelineBackendStatus
} from '../api/pipelines';

const router = Router();

// Check if the pipeline backend is running
router.get('/status', checkPipelineBackendStatus);

// Trigger different pipelines
router.post('/fec', triggerFecPipeline);
router.post('/congress', triggerCongressPipeline);
router.post('/stock', triggerStockPipeline);

// Get status of a specific pipeline run
router.get('/:id/status', getPipelineStatus);

export default router;