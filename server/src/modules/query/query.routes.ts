import { Router } from 'express'

import {
  createRecord,
  createTimeRange,
  deleteRecord,
  deleteTimeRange,
  getRecord,
  getTimeRange,
  listRecords,
  listTimeRanges,
  updateRecord,
  updateTimeRange,
} from './query.controller'

const router = Router()

router.get('/records', listRecords)
router.get('/records/:id', getRecord)
router.post('/records', createRecord)
router.put('/records/:id', updateRecord)
router.delete('/records/:id', deleteRecord)

router.get('/time-ranges', listTimeRanges)
router.get('/time-ranges/:id', getTimeRange)
router.post('/time-ranges', createTimeRange)
router.put('/time-ranges/:id', updateTimeRange)
router.delete('/time-ranges/:id', deleteTimeRange)

export default router
