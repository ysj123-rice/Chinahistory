import type { KnowledgeEdge, KnowledgeNode } from '@prisma/client'

export const toKnowledgeNodeDto = (node: KnowledgeNode) => ({
  id: node.id,
  source_key: node.sourceKey,
  node_id: node.nodeId,
  type: node.type,
  label: node.label,
  description: node.description,
  owner_name: node.ownerName,
  era: node.era,
  location: node.location,
  related_clan: node.relatedClan,
  source: node.source,
})

export const toKnowledgeEdgeDto = (edge: KnowledgeEdge) => ({
  id: edge.id,
  source_key: edge.sourceKey,
  edge_id: edge.edgeId,
  source: edge.source,
  target: edge.target,
  label: edge.label,
})
