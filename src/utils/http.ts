import { REQUEST_TIMEOUT } from '@/constants/http'
import { toCamelCaseKeys } from '@/utils/case'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
  error_code?: string
}

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

type RequestInterceptor = (options: RequestInit) => RequestInit
type ErrorInterceptor = (error: Error) => void

const requestInterceptors: RequestInterceptor[] = []
const errorInterceptors: ErrorInterceptor[] = []

let activeRequests = 0
const loadingListeners = new Set<(loading: boolean) => void>()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  throw new Error('缺少 VITE_API_BASE_URL 配置')
}

const buildUrl = (path: string, params?: RequestOptions['params']) => {
  const url = new URL(path, API_BASE_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) {
        return
      }
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

const request = async <T>(path: string, options: RequestOptions): Promise<T> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  activeRequests += 1
  loadingListeners.forEach((listener) => listener(activeRequests > 0))

  try {
    let requestInit: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    }

    requestInterceptors.forEach((interceptor) => {
      requestInit = interceptor(requestInit)
    })

    const response = await fetch(buildUrl(path, options.params), requestInit)

    const payload = (await response.json()) as ApiResponse<T>
    if (!response.ok || !payload.success) {
      const message = payload?.message ?? '请求失败'
      throw new Error(message)
    }

    return toCamelCaseKeys(payload.data)
  } catch (error) {
    console.error('API请求失败', error)
    errorInterceptors.forEach((handler) => handler(error as Error))
    throw error
  } finally {
    activeRequests = Math.max(0, activeRequests - 1)
    loadingListeners.forEach((listener) => listener(activeRequests > 0))
    window.clearTimeout(timeout)
  }
}

export const apiGet = <T>(path: string, params?: RequestOptions['params']) =>
  request<T>(path, { method: 'GET', params })

export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body })

export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body })

export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' })

export const addRequestInterceptor = (interceptor: RequestInterceptor) => {
  requestInterceptors.push(interceptor)
}

export const addErrorInterceptor = (handler: ErrorInterceptor) => {
  errorInterceptors.push(handler)
}

export const subscribeLoading = (listener: (loading: boolean) => void) => {
  loadingListeners.add(listener)
  listener(activeRequests > 0)
  return () => loadingListeners.delete(listener)
}
