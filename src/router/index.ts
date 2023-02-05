import Welcome from '@v/views/welcome/index.vue'
import Login from '@v/views/login/index.vue'
import Home from '@v/views/home/index.vue'
import Library from '@v/views/home/library/index.vue'
import * as VueRouter from 'vue-router'
import { reqIsFirst } from '@v/api'

import { useSessionStorage } from '@vueuse/core'

const routes = [
    { path: '/', redirect: '/login' },
    { path: '/welcome', component: Welcome },
    { path: '/login', component: Login },
    {
        path: '/home',
        component: Home,
        children: [
            { path: '', redirect: '/home/library' },
            { path: 'library', component: Library },
        ],
    },
]

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
})

router.beforeEach(async (to, from) => {
    console.log('from', from.path, 'to', to.path)

    if (to.path === '/welcome') {
        const first = localStorage.getItem('first')
        if (first === 'true') {
            return true
        } else if (first === 'false') {
            // if (from.path === '/login') {
            //     return '/home'
            // }
            return false
        } else {
            return await reqIsFirst()
        }
    }
    if (to.path === '/login') {
        if (from.path === '/welcome') {
            return true
        }
        if (
            sessionStorage.getItem('loggedIn') === 'true' &&
            sessionStorage.getItem('logout') !== 'true'
        ) {
            if (from.path === '/') {
                return '/home'
            }
            return false
        }
        return true
    } else {
        if (sessionStorage.getItem('loggedIn') === 'true') {
            console.log('~~~', to.path)

            return true
        } else {
            console.log('~~~', '/login')
            return '/login'
        }
    }
})

export default router
