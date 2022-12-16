import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/display.css'
import { ConfigProvider } from 'vant'
createApp(App)
    .use(ElementPlus, { size: 'small', zIndex: 3000 })
    .use(ConfigProvider)
    .mount('#app')
    .$nextTick(() => {
        postMessage({ payload: 'removeLoading' }, '*')
    })
