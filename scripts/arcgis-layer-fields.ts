import https from 'node:https'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type EnvMap = Record<string, string>
type LayerField = {
  name: string
  alias?: string
  type?: string
  length?: number
}
type ServiceLayerSummary = {
  id: number
  name?: string
  geometryType?: string
  type?: string
}
type ServiceResponse = {
  layers?: ServiceLayerSummary[]
  tables?: ServiceLayerSummary[]
  error?: {
    message?: string
    details?: string[]
  }
}
type LayerResponse = {
  id?: number
  name?: string
  geometryType?: string
  type?: string
  fields?: LayerField[]
  error?: {
    message?: string
    details?: string[]
  }
}
type ServiceOutput = {
  key: string
  label: string
  serviceUrl: string
  layers: LayerResponse[]
  error?: ServiceResponse['error']
}

const OUTPUT_PATH = resolve(process.cwd(), 'scripts', 'outputs', 'arcgis-layer-fields.json')
const SUMMARY_PATH = resolve(process.cwd(), 'scripts', 'outputs', 'arcgis-layer-summary.json')
const ENV_FILE = resolve(process.cwd(), '.env.local')

const parseEnvFile = (filePath: string): EnvMap => {
  if (!existsSync(filePath)) {
    return {}
  }

  const content = readFileSync(filePath, 'utf-8')
  const result: EnvMap = {}

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return
    }
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      return
    }
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  })

  return result
}

const requestJson = async <T extends LayerResponse | ServiceResponse>(url: string): Promise<T> =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const { statusCode } = response
        let rawData = ''

        response.on('data', (chunk) => {
          rawData += chunk
        })

        response.on('end', () => {
          if (!statusCode || statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Request failed with status ${statusCode ?? 'unknown'}`))
            return
          }

          try {
            const parsed = JSON.parse(rawData) as T
            resolve(parsed)
          } catch (error) {
            reject(error)
          }
        })
      })
      .on('error', (error) => {
        reject(error)
      })
  })

const ensureOutputDir = () => {
  const dirPath = resolve(process.cwd(), 'scripts', 'outputs')
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

const normalizeServiceUrl = (url: string) => url.replace(/\/+$/, '')

const buildRequestUrl = (baseUrl: string, apiKey?: string) => {
  const requestUrl = new URL(baseUrl)
  requestUrl.searchParams.set('f', 'pjson')
  if (apiKey) {
    requestUrl.searchParams.set('token', apiKey)
  }
  return requestUrl
}

const resolveEnvValue = (env: EnvMap, key: string) => process.env[key] ?? env[key]

const main = async () => {
  const envFromFile = parseEnvFile(ENV_FILE)
  const apiKey = resolveEnvValue(envFromFile, 'VITE_ARCGIS_API_KEY')

  const services = [
    {
      key: 'yuan',
      label: '元代',
      serviceUrl:
        resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL_YUAN') ??
        resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL'),
    },
    { key: 'tang', label: '唐代', serviceUrl: resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL_TANG') },
    { key: 'ming', label: '明代', serviceUrl: resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL_MING') },
    {
      key: 'southernSong',
      label: '南宋',
      serviceUrl: resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL_SOUTHERN_SONG'),
    },
    {
      key: 'northernSong',
      label: '北宋',
      serviceUrl: resolveEnvValue(envFromFile, 'VITE_ARCGIS_SERVICE_URL_NORTHERN_SONG'),
    },
  ].filter((item) => Boolean(item.serviceUrl))

  if (services.length === 0) {
    throw new Error(
      'Missing ArcGIS service URLs. Set VITE_ARCGIS_SERVICE_URL_YUAN/TANG/MING/SOUTHERN_SONG/NORTHERN_SONG.',
    )
  }

  const results: ServiceOutput[] = []

  for (const service of services) {
    const normalizedServiceUrl = normalizeServiceUrl(service.serviceUrl as string)
    const metaUrl = buildRequestUrl(normalizedServiceUrl, apiKey)
    const serviceMeta = await requestJson<ServiceResponse>(metaUrl.toString())

    if (serviceMeta.error) {
      results.push({
        key: service.key,
        label: service.label,
        serviceUrl: normalizedServiceUrl,
        layers: [],
        error: serviceMeta.error,
      })
      continue
    }

    const layers = serviceMeta.layers ?? []
    const layerResults: LayerResponse[] = []

    for (const layer of layers) {
      const layerUrl = buildRequestUrl(`${normalizedServiceUrl}/${layer.id}`, apiKey)
      const response = await requestJson<LayerResponse>(layerUrl.toString())
      if (response.error) {
        layerResults.push({ id: layer.id, name: layer.name, error: response.error })
        continue
      }
      layerResults.push({
        id: layer.id,
        name: response.name ?? layer.name,
        type: response.type,
        geometryType: response.geometryType ?? layer.geometryType,
        fields: response.fields ?? [],
      })
    }

    results.push({
      key: service.key,
      label: service.label,
      serviceUrl: normalizedServiceUrl,
      layers: layerResults,
    })
  }

  ensureOutputDir()
  const generatedAt = new Date().toISOString()
  writeFileSync(OUTPUT_PATH, JSON.stringify({ generatedAt, services: results }, null, 2), 'utf-8')

  const summary = results.map((service) => ({
    key: service.key,
    label: service.label,
    serviceUrl: service.serviceUrl,
    layerCount: service.layers.length,
    layers: service.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      geometryType: layer.geometryType,
    })),
    error: service.error,
  }))

  writeFileSync(SUMMARY_PATH, JSON.stringify({ generatedAt, services: summary }, null, 2), 'utf-8')
  console.log(`Layer fields written to: ${OUTPUT_PATH}`)
  console.log(`Layer summary written to: ${SUMMARY_PATH}`)
}

main().catch((error) => {
  console.error('Failed to fetch layer fields:', error)
  process.exitCode = 1
})
