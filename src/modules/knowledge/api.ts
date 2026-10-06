import { API_ENDPOINTS } from '@/constants/api'
import type { ApiListResult } from '@/types/api'
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/http'

import type { KnowledgeEdge, KnowledgeNode, KnowledgeNodeType } from './constants'

export type KnowledgeNodeApi = {
  id: number
  nodeId: string
  type: KnowledgeNodeType
  label: string
  description: string
  ownerName: string
  era?: string
  location?: string
  relatedClan?: string
  source?: string
}

export type KnowledgeEdgeApi = {
  id: number
  edgeId: string
  source: string
  target: string
  label: string
}

const mapNode = (node: KnowledgeNodeApi): KnowledgeNode => ({
  id: node.nodeId,
  type: node.type,
  label: node.label,
  description: node.description,
  ownerName: node.ownerName,
  era: node.era ?? undefined,
  location: node.location ?? undefined,
  relatedClan: node.relatedClan ?? undefined,
  source: node.source ?? undefined,
})

const mapEdge = (edge: KnowledgeEdgeApi): KnowledgeEdge => ({
  id: edge.edgeId,
  source: edge.source,
  target: edge.target,
  label: edge.label,
})

export const fetchKnowledgeNodes = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<KnowledgeNodeApi>>(API_ENDPOINTS.knowledgeNodes, {
    source_key: sourceKey,
  })
  return result.items.map(mapNode)
}

export const fetchKnowledgeEdges = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<KnowledgeEdgeApi>>(API_ENDPOINTS.knowledgeEdges, {
    source_key: sourceKey,
  })
  return result.items.map(mapEdge)
}

export const fetchKnowledgeNodesAdmin = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<KnowledgeNodeApi>>(API_ENDPOINTS.knowledgeNodes, {
    source_key: sourceKey,
  })
  return result.items
}

export const fetchKnowledgeEdgesAdmin = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<KnowledgeEdgeApi>>(API_ENDPOINTS.knowledgeEdges, {
    source_key: sourceKey,
  })
  return result.items
}

export type KnowledgeNodePayload = {
  source_key: string
  node_id: string
  type: string
  label: string
  description: string
  owner_name: string
  era?: string
  location?: string
  related_clan?: string
  source?: string
}

export type KnowledgeEdgePayload = {
  source_key: string
  edge_id: string
  source: string
  target: string
  label: string
}

export const createKnowledgeNode = (payload: KnowledgeNodePayload) =>
  apiPost<KnowledgeNode>(API_ENDPOINTS.knowledgeNodes, payload)

export const updateKnowledgeNode = (id: number, payload: KnowledgeNodePayload) =>
  apiPut<KnowledgeNode>(`${API_ENDPOINTS.knowledgeNodes}/${id}`, payload)

export const deleteKnowledgeNode = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.knowledgeNodes}/${id}`)

export const createKnowledgeEdge = (payload: KnowledgeEdgePayload) =>
  apiPost<KnowledgeEdge>(API_ENDPOINTS.knowledgeEdges, payload)

export const updateKnowledgeEdge = (id: number, payload: KnowledgeEdgePayload) =>
  apiPut<KnowledgeEdge>(`${API_ENDPOINTS.knowledgeEdges}/${id}`, payload)

export const deleteKnowledgeEdge = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.knowledgeEdges}/${id}`)
