import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/display.css' //断点隐藏
import { ConfigProvider } from 'vant'
import * as VueRouter from 'vue-router'
import routes from './routes'

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
})
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
    console.log('globalError', err, instance, info)
}

app.use(ElementPlus, { size: 'small', zIndex: 3000 })
    .use(ConfigProvider)
    .use(router)
    .mount('#app')
    .$nextTick(() => {
        postMessage({ payload: 'removeLoading' }, '*')
    })
