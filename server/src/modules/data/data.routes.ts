import { Router } from 'express'

import { createRecord, deleteRecord, getRecord, listRecords, updateRecord } from './data.controller'

const router = Router()

router.get('/records', listRecords)
router.get('/records/:id', getRecord)
router.post('/records', createRecord)
router.put('/records/:id', updateRecord)
router.delete('/records/:id', deleteRecord)

export default router
