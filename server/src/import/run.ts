import '../config/env'

import { prisma } from '../prisma/client'
import { importSurnameOrigins } from './importSurnameOrigins'
import { importMigrationEvents } from './importMigrationEvents'
import { importMigrationRoutes } from './importMigrationRoutes'
import { importPersons } from './importPersons'
import { importKnowledgeGraph } from './importKnowledgeGraph'

const main = async () => {
  console.log('[1/5] 导入姓氏源流 ...')
  const origins = await importSurnameOrigins()
  console.log(`      ✓ ${origins} 条姓氏源流`)

  console.log('[2/5] 导入宏观迁徙事件 ...')
  const events = await importMigrationEvents()
  console.log(`      ✓ ${events} 条迁徙事件`)

  console.log('[3/5] 导入分姓氏迁徙路线（Shapefile）...')
  const routes = await importMigrationRoutes()
  console.log(`      ✓ ${routes.points} 个路线点，${routes.routes} 条迁徙路线`)

  console.log('[4/5] 导入 CBDB 历史人物 ...')
  const persons = await importPersons()
  console.log(`      ✓ ${persons.imported} 位真实人物（默认隐藏 ${persons.hidden} 位非中原人物）`)
  console.log('      各朝代/来源分布：')
  for (const [key, count] of Object.entries(persons.bySourceKey).sort((a, b) => b[1] - a[1])) {
    console.log(`        - ${key}: ${count}`)
  }
  console.log('      跳过：', persons.skipReasons, `；一人多籍贯地址 ${persons.duplicateAddr} 条取首条`)

  console.log('[5/5] 重建知识图谱（真实数据）...')
  await importKnowledgeGraph()
}

main()
  .catch((error) => {
    console.error('导入失败：', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
