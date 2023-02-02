import axios from 'axios'

//配置项
const requests = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
    // /跨域请求时是否需要使用凭证
    withCredentials: true,
})

//请求拦截器
requests.interceptors.request.use((config) => {
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
        return Promise.reject(error)
    },
)

export default requests
