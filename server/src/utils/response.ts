export type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

export type ApiFailure = {
  success: false
  error_code: string
  message: string
}

export const buildSuccess = <T>(data: T, message = 'ok'): ApiSuccess<T> => ({
  success: true,
  data,
  message,
})

export const buildFailure = (message: string, errorCode = 'internal_error'): ApiFailure => ({
  success: false,
  error_code: errorCode,
  message,
})
