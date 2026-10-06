export class ApiError extends Error {
  status: number

  code: string

  constructor(message: string, status = 500, code = 'internal_error') {
    super(message)
    this.status = status
    this.code = code
  }
}
