import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  // 定义你的路由
  // {
  //   path: '/',
  //   name: 'Home',
  //   component: () => import('@/views/Home.vue')
  // }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router