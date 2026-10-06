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
