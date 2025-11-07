import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/common/Login.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/operator',
    name: 'Operator',
    component: () => import('@/components/operator/OperatorPanel.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/components/admin/AdminPanel.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router