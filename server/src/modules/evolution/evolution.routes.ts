import { Router } from 'express'

import {
  createFlow,
  createPeriod,
  deleteFlow,
  deletePeriod,
  getFlow,
  getPeriod,
  listFlows,
  listPeriods,
  updateFlow,
  updatePeriod,
} from './evolution.controller'

const router = Router()

router.get('/periods', listPeriods)
router.get('/periods/:id', getPeriod)
router.post('/periods', createPeriod)
router.put('/periods/:id', updatePeriod)
router.delete('/periods/:id', deletePeriod)

router.get('/flows', listFlows)
router.get('/flows/:id', getFlow)
router.post('/flows', createFlow)
router.put('/flows/:id', updateFlow)
router.delete('/flows/:id', deleteFlow)

export default router
