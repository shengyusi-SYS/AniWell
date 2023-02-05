import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/display.css' //断点隐藏
import { ConfigProvider } from 'vant'
import router from './router'
import { Lazyload } from 'vant'

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
    console.log('globalError', err, instance, info)
}
;(async () => {
    //验证是否已注册
    // const res = await window.electronAPI.signUp()
    // app.config.globalProperties.signUp = res
    try {
        app.provide('signUp', await window.electronAPI.signUp())
    } catch (error) {}

    app.use(ElementPlus, { size: 'small', zIndex: 3000 })
        .use(ConfigProvider)
        .use(router)
        .use(Lazyload, {
            lazyComponent: true,
        })
        .mount('#app')
        .$nextTick(() => {
            postMessage({ payload: 'removeLoading' }, '*')
        })
})()
