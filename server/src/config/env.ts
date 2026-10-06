import dotenv from 'dotenv'

dotenv.config()

const requiredEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`缺少环境变量: ${key}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? '3100'),
  databaseUrl: requiredEnv('DATABASE_URL'),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? '*',
}
