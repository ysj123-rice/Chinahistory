import { Router } from 'express'

import { getPoints, getSourceCounts, getSurnameCounts } from './person.controller'

const router = Router()

router.get('/points', getPoints)
router.get('/surname-counts', getSurnameCounts)
router.get('/source-counts', getSourceCounts)

export default router
