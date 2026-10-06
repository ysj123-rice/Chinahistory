import { createRouter, createWebHistory } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routePaths'
import AnalysisPage from '@/pages/AnalysisPage.vue'
import DataPage from '@/pages/DataPage.vue'
import EvolutionPage from '@/pages/EvolutionPage.vue'
import HomePage from '@/pages/HomePage.vue'
import KnowledgePage from '@/pages/KnowledgePage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import QueryPage from '@/pages/QueryPage.vue'
import ThematicPage from '@/pages/ThematicPage.vue'

const isAuthenticated = () => localStorage.getItem('auth_token') === 'admin'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: ROUTE_PATHS.home, name: 'home', component: HomePage },
    { path: ROUTE_PATHS.login, name: 'login', component: LoginPage },
    { path: ROUTE_PATHS.query, name: 'query', component: QueryPage },
    { path: ROUTE_PATHS.analysis, name: 'analysis', component: AnalysisPage },
    { path: ROUTE_PATHS.thematic, name: 'thematic', component: ThematicPage },
    { path: ROUTE_PATHS.knowledge, name: 'knowledge', component: KnowledgePage },
    { path: ROUTE_PATHS.data, name: 'data', component: DataPage },
    { path: ROUTE_PATHS.evolution, name: 'evolution', component: EvolutionPage },
  ],
})

router.beforeEach((to) => {
  if (to.path === ROUTE_PATHS.login) {
    if (isAuthenticated()) {
      return ROUTE_PATHS.home
    }
    return true
  }

  if (!isAuthenticated()) {
    return ROUTE_PATHS.login
  }

  return true
})

export default router
