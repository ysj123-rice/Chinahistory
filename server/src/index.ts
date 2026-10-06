import cors from 'cors'
import express, { type Request, type Response } from 'express'

import { env } from './config/env'
import { errorHandler } from './middlewares/errorHandler'
import { notFoundHandler } from './middlewares/notFound'
import routes from './routes'
import { buildSuccess } from './utils/response'

const app = express()

app.use(
  cors({
    origin: env.frontendOrigin === '*' ? true : env.frontendOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req: Request, res: Response) => {
  res.json(buildSuccess({ status: 'ok' }))
})

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`Mock server listening on ${env.port}`)
})
