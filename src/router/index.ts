import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 定义路由
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/logs'
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/LogViewer.vue'),
    meta: {
      title: '日志查看'
    }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/views/RuleManager.vue'),
    meta: {
      title: '规则管理'
    }
  },
  {
    path: '/logsrules',
    name: 'LogRules',
    component: () => import('@/views/LogRuleCustomizer.vue'),
    meta: {
      title: '日志规则定制'
    }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('@/views/RuleAnalysis.vue'),
    meta: {
      title: '规则分析'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 全局消息处理
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 智能日志分析工具`
  }

  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  // 可以在这里触发全局错误消息
})

export default router