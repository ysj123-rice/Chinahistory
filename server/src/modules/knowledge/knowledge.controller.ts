import type { Request, Response } from 'express'

import { ApiError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'
import { buildSuccess } from '../../utils/response'
import { requireFields } from '../../utils/validators'
import { toKnowledgeEdgeDto, toKnowledgeNodeDto } from './knowledge.mapper'
import {
  createKnowledgeEdge,
  createKnowledgeNode,
  deleteKnowledgeEdge,
  deleteKnowledgeNode,
  getKnowledgeEdge,
  getKnowledgeNode,
  listKnowledgeEdges,
  listKnowledgeNodes,
  updateKnowledgeEdge,
  updateKnowledgeNode,
} from './knowledge.service'
import type { KnowledgeEdgePayload, KnowledgeNodePayload } from './knowledge.types'

const parseId = (value: string) => {
  const id = Number(value)
  if (Number.isNaN(id)) {
    throw new ApiError('无效的ID', 400, 'invalid_id')
  }
  return id
}

const parseNodePayload = (payload: KnowledgeNodePayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'node_id',
    'type',
    'label',
    'description',
    'owner_name',
  ])

  return {
    sourceKey: payload.source_key,
    nodeId: payload.node_id,
    type: payload.type,
    label: payload.label,
    description: payload.description,
    ownerName: payload.owner_name,
    era: payload.era ?? null,
    location: payload.location ?? null,
    relatedClan: payload.related_clan ?? null,
    source: payload.source ?? null,
  }
}

const parseEdgePayload = (payload: KnowledgeEdgePayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'edge_id',
    'source',
    'target',
    'label',
  ])

  return {
    sourceKey: payload.source_key,
    edgeId: payload.edge_id,
    source: payload.source,
    target: payload.target,
    label: payload.label,
  }
}

export const listNodes = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const type = typeof req.query.type === 'string' ? req.query.type : undefined
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined

  const nodes = await listKnowledgeNodes({ sourceKey, type, keyword })
  res.json(buildSuccess({ items: nodes.map(toKnowledgeNodeDto) }))
})

export const listEdges = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const edges = await listKnowledgeEdges(sourceKey)
  res.json(buildSuccess({ items: edges.map(toKnowledgeEdgeDto) }))
})

export const getNode = asyncHandler(async (req: Request, res: Response) => {
  const node = await getKnowledgeNode(parseId(req.params.id))
  if (!node) {
    throw new ApiError('节点不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toKnowledgeNodeDto(node)))
})

export const getEdge = asyncHandler(async (req: Request, res: Response) => {
  const edge = await getKnowledgeEdge(parseId(req.params.id))
  if (!edge) {
    throw new ApiError('关系不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toKnowledgeEdgeDto(edge)))
})

export const createNode = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseNodePayload(req.body as KnowledgeNodePayload)
  const node = await createKnowledgeNode(payload)
  res.status(201).json(buildSuccess(toKnowledgeNodeDto(node), 'created'))
})

export const updateNode = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseNodePayload(req.body as KnowledgeNodePayload)
  const node = await updateKnowledgeNode(parseId(req.params.id), payload)
  res.json(buildSuccess(toKnowledgeNodeDto(node), 'updated'))
})

export const deleteNode = asyncHandler(async (req: Request, res: Response) => {
  await deleteKnowledgeNode(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

export const createEdge = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseEdgePayload(req.body as KnowledgeEdgePayload)
  const edge = await createKnowledgeEdge(payload)
  res.status(201).json(buildSuccess(toKnowledgeEdgeDto(edge), 'created'))
})

export const updateEdge = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseEdgePayload(req.body as KnowledgeEdgePayload)
  const edge = await updateKnowledgeEdge(parseId(req.params.id), payload)
  res.json(buildSuccess(toKnowledgeEdgeDto(edge), 'updated'))
})

export const deleteEdge = asyncHandler(async (req: Request, res: Response) => {
  await deleteKnowledgeEdge(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})
