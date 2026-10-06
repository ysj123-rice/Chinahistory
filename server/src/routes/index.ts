import { Router } from 'express'

import dataRoutes from '../modules/data/data.routes'
import evolutionRoutes from '../modules/evolution/evolution.routes'
import homeRoutes from '../modules/home/home.routes'
import knowledgeRoutes from '../modules/knowledge/knowledge.routes'
import migrationRoutes from '../modules/migration/migration.routes'
import personRoutes from '../modules/person/person.routes'
import queryRoutes from '../modules/query/query.routes'
import surnameRoutes from '../modules/surname/surname.routes'

const router = Router()

router.use('/query', queryRoutes)
router.use('/data', dataRoutes)
router.use('/knowledge', knowledgeRoutes)
router.use('/evolution', evolutionRoutes)
router.use('/home', homeRoutes)

// 真实数据接口（CBDB 人物 / 姓氏源流 / 宏观迁徙事件 / 分姓迁徙路线）
router.use('/persons', personRoutes)
router.use('/surname', surnameRoutes)
router.use('/migration', migrationRoutes)

export default router
