import { Router } from 'express'

import { getOrigin, listOrigins, listRouteSurnameOptions, listRoutes } from './surname.controller'

const router = Router()

// 姓氏源流
router.get('/origin/:surname', getOrigin)
router.get('/origins', listOrigins)

// 分姓氏迁徙路线
router.get('/routes', listRoutes)
router.get('/routes/surnames', listRouteSurnameOptions)

export default router
