import { Router } from 'express'

import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  getEdge,
  getNode,
  listEdges,
  listNodes,
  updateEdge,
  updateNode,
} from './knowledge.controller'

const router = Router()

router.get('/nodes', listNodes)
router.get('/nodes/:id', getNode)
router.post('/nodes', createNode)
router.put('/nodes/:id', updateNode)
router.delete('/nodes/:id', deleteNode)

router.get('/edges', listEdges)
router.get('/edges/:id', getEdge)
router.post('/edges', createEdge)
router.put('/edges/:id', updateEdge)
router.delete('/edges/:id', deleteEdge)

export default router
