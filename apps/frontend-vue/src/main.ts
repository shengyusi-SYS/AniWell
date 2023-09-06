import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/theme-chalk/display.css' //断点隐藏
import { ConfigProvider } from 'vant'
import router from './router'
import { Lazyload } from 'vant'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { clientLog } from './api'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
    clientLog('globalError', err, 'instance\r', instance, 'info\r', info, '\r')
}

const pinia = createPinia()

app.use(pinia)
    .use(ConfigProvider)
    .use(router)
    .use(Lazyload, {
        lazyComponent: true,
    })
    .mount('#app')
    .$nextTick(() => {
        postMessage({ payload: 'removeLoading' }, '*')
    })
