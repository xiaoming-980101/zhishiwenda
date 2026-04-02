import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'root',
    component: Layout,
    redirect: { name: 'Home' },
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: {
          title: '冲刺总览',
        },
      },
      {
        path: 'practice',
        name: 'Practice',
        component: () => import('@/views/practice/index.vue'),
        meta: {
          title: '考试练习',
        },
      },
      {
        path: 'memory',
        name: 'Memory',
        component: () => import('@/views/memory/index.vue'),
        meta: {
          title: '考点速记',
        },
      },
      {
        path: 'mock-exam',
        name: 'MockExam',
        component: () => import('@/views/mock-exam/index.vue'),
        meta: {
          title: '模拟考试',
        },
      },
      {
        path: 'wrong-book-export',
        name: 'WrongBookExport',
        component: () => import('@/views/wrong-book-export/index.vue'),
        meta: {
          title: '错题本导出',
          noCache: true,
        },
      },
      {
        path: 'sprint-mode',
        name: 'SprintMode',
        component: () => import('@/views/sprint-mode/index.vue'),
        meta: {
          title: '考前冲刺',
          noCache: true,
        },
      },
      {
        path: 'print-pack',
        name: 'PrintPack',
        component: () => import('@/views/print-pack/index.vue'),
        meta: {
          title: '打印速记',
          noCache: true,
        },
      },
    ],
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/404.vue'),
    meta: {
      title: '页面未找到',
      noCache: true,
    },
  },
]

export default routes
