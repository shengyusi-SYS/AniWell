import Welcome from '@v/views/welcome/index.vue'
import Home from '@v/views/home/index.vue'
import Library from '@v/views/home/library/index.vue'
import * as VueRouter from 'vue-router'

const routes = [
    { path: '/welcome', component: Welcome },
    { path: '/home', component: Home, children: [{ path: 'library', component: Library }] },
]

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
})

export default router
