// import Welcome from '@v/views/welcome/index.vue'
// import Login from '@v/views/login/index.vue'
// import Home from '@v/views/home/index.vue'
// import Library from '@v/views/home/library/index.vue'
// import Settings from '@v/views/home/settings/index.vue'
// import VideoPlayer from '@v/views/videoPlayer/index.vue'
import * as VueRouter from 'vue-router'
import { reqIsFirst } from '@v/api'
import { proxyGlobalData, globalCache } from '@v/stores/global'

import { useSessionStorage } from '@vueuse/core'

const routes: VueRouter.RouterOptions['routes'] = [
    { path: '/', redirect: '/login' },
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@v/views/welcome/index.vue'),
        beforeEnter: async (to, from) => {
            console.log('welcome!', to, from)
            const first = proxyGlobalData.first
            if (first === true) {
                return true
            } else if (first === false) {
                return false
            } else {
                return await reqIsFirst()
            }
        },
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@v/views/login/index.vue'),
        beforeEnter: (to, from) => {
            console.log('login!', to, from)
            if (from.path === '/welcome') {
                return true
            }
            if (
                sessionStorage.getItem('loggedIn') === 'true' &&
                sessionStorage.getItem('logout') !== 'true'
            ) {
                if (from.path === '/') {
                    return { name: 'home' }
                }
                return false
            } else return true
        },
    },
    {
        path: '/home',
        component: () => import('@v/views/home/index.vue'),
        children: [
            { path: '', name: 'home', redirect: '/home/library' },
            {
                path: 'library',
                name: 'library',
                component: () => import('@v/views/home/library/index.vue'),
                props: true,
                // children: [{ path: '', redirect: '' }]
            },
            {
                path: 'settings',
                name: 'settings',
                component: () => import('@v/views/home/settings/index.vue'),
            },
        ],
    },

    {
        path: '/item',
        name: 'item',
        component: () => import('@v/views/item/index.vue'),
        children: [
            {
                path: 'test',
                name: 'test',
                component: () => import('@v/components/TestTemplate/index.vue'),
                props: true,
            },
            {
                path: '/videoPlayer',
                name: 'videoPlayer',
                component: () => import('@v/views/item/videoPlayer/index.vue'),
                props: true,
            },
        ],
    },
]

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
    // scrollBehavior(to, from, savedPosition) {
    //     console.log('~~~~~~~~~', to, from, savedPosition, '==========')
    //     if (savedPosition) {
    //         return savedPosition
    //     } else {
    //         return { el: '#app', top: 0 }
    //     }
    // },
})

router.beforeEach(async (to, from) => {
    console.log('from', from.path, '>>>>>', 'to', to.path)
    if (globalCache.loggedIn) {
        return true
    } else {
        if (to.path === '/login') {
            return true
        } else return '/login'
    }
})

export default router
