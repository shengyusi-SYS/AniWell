import axios from "axios"
import { globalCache } from "@v/stores/global"
import router from "@v/router"

//配置项
const requests = axios.create({
    baseURL: "/api/v1",
    timeout: 10000,
    // /跨域请求时是否需要使用凭证
    // withCredentials: true,
})

//请求拦截器
requests.interceptors.request.use((config) => {
    // if (globalCache.electronEnv && !import.meta.env.DEV) {
    //     config.headers.set('electron', 'true')
    // }
    return config
})
//响应拦截器
requests.interceptors.response.use(
    (res) => {
        if (res.status === 200 && !res.data) {
            return true
        } else return res.data
    },
    (error) => {
        //全局错误通知
        const errorData = error.response.data
        if (errorData.alert) {
            globalCache.alertMessages.value = errorData.message ?? errorData.error
        }
        if (error.response.status === 403) {
            router.replace({ name: "login" })
        }
        return Promise.reject(error)
    },
)

export default requests
