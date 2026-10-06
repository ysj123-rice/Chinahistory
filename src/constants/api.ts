export const API_BASE_PATH = '/api'

export const API_ENDPOINTS = {
  homeSummary: `${API_BASE_PATH}/home/summary`,
  queryRecords: `${API_BASE_PATH}/query/records`,
  queryTimeRanges: `${API_BASE_PATH}/query/time-ranges`,
  dataRecords: `${API_BASE_PATH}/data/records`,
  knowledgeNodes: `${API_BASE_PATH}/knowledge/nodes`,
  knowledgeEdges: `${API_BASE_PATH}/knowledge/edges`,
  evolutionPeriods: `${API_BASE_PATH}/evolution/periods`,
  evolutionFlows: `${API_BASE_PATH}/evolution/flows`,
  // 真实数据
  personPoints: `${API_BASE_PATH}/persons/points`,
  personSurnameCounts: `${API_BASE_PATH}/persons/surname-counts`,
  surnameOrigin: `${API_BASE_PATH}/surname/origin`,
  surnameRoutes: `${API_BASE_PATH}/surname/routes`,
  migrationEvents: `${API_BASE_PATH}/migration/events`,
}
