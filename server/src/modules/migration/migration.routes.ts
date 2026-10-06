import { Router } from 'express'

import { listCauses, listEvents } from './migration.controller'

const router = Router()

router.get('/events', listEvents)
router.get('/causes', listCauses)

export default router
