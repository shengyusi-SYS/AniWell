import requests from "./request"
import bcrypt from "bcryptjs"
import { libraryData, resultType } from "@v/stores/library"
import { globalCache, proxyGlobalData } from "@v/stores/global"
import { io } from "socket.io-client"
import { UAParser } from "ua-parser-js"
import { createTRPCProxyClient, httpBatchLink, httpLink } from "@trpc/client"
import type { AppRouter } from "src/server/trpc/router"
import assetsCache from "@v/stores/assetsCache"
import { Base64 } from "js-base64"
import axios from "axios"

export const socket = io()
const ua = new UAParser().getResult()

socket.on("connect", () => {
    console.log(socket.id)
})
socket.on("data", (data) => {
    // console.log(data)
})
socket.on("time", (time) => {
    // console.log(time)
    const delay = Date.now() - time
    globalCache.serverDelay.add(delay)
})
//服务端推送的日志
socket.on("log", (log) => {
    globalCache.serverLog.info(log)
})

//任务进度
export interface TaskProgress {
    state: "pending" | "fulfilled" | "rejected"
    name: string
    uuid: string
    total?: number
    percentage?: number //computed
    stageName?: string
    stageId?: number
    stageTotal?: number
    stagePercentage?: number //computed
    currentName?: string
    currentId?: number
}
socket.on("progress", (taskProgress: TaskProgress) => {
    globalCache.serverTaskProgress.add(taskProgress)
})

//客户端日志上传到服务端
export const clientLog = (...args: any[]) => {
    console.log("clientLog", args)
    try {
        const msg = JSON.stringify(args, null, "\t")
        socket.emit("clientLog", msg)
    } catch (error) {}
}
// clientLog(ua)

//客户端不方便查看控制台时用
// export const reqDebug = (...args: any[]) => {
//     const msg = args
//         .map((v) => (v && typeof v === 'object' ? JSON.stringify(v, null, '\t') : v))
//         .join(' ')

//     return requests.post('/debug', msg)
// }

const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpLink({
            url: window.location.origin + "/trpc",
        }),
    ],
})

//海报图请求(伪协商缓存)
export const reqPoster = async (path: string, src?: Ref<string | Blob>) => {
    try {
        const cache = (await assetsCache.getItem(path)) as { data: string; latest: string }
        if (src && cache?.data)
            src.value = URL.createObjectURL(new Blob([Base64.toUint8Array(cache.data)]))

        const res = await client.assets.getPoster.query({
            type: "poster",
            path,
            latest: cache?.latest,
        })

        if (res?.data) {
            assetsCache.setItem(path, res)
            return URL.createObjectURL(new Blob([Base64.toUint8Array(res.data)]))
        } else if (!src && cache?.data)
            return URL.createObjectURL(new Blob([Base64.toUint8Array(cache.data)]))
        else return
    } catch (error) {
        assetsCache.removeItem(path).catch()
        console.log(error)
        return
    }
}

export const reqSalt = (username: string): Promise<{ salt: string }> =>
    requests.get("/users/salt?username=" + username)

//利用httponly的cookie无法被js读写的特性进行检查
const checkToken = () => {
    document.cookie = "refreshToken=refreshToken;path=/;"
    return !/refreshToken=refreshToken/.test(document.cookie)
}

export const reqAutoLogin = async () => {
    //检查是否已获得refreshToken或是自动登录
    if (checkToken()) {
        //尝试仅通过cookie验证
        try {
            await requests.get("/users/login")
            globalCache.loggedIn = true
            return true
        } catch (error) {
            return false
        }
    }
}

//登录流程，还是把自动登录独立出来好一点
let tried = false
export const reqLogin = async (username?: string, password?: string): Promise<boolean> => {
    try {
        //请求用户名对应的salt,如果本地存储有salt则尝试以本地salt登录
        let salt = proxyGlobalData.salt
        if (!salt) {
            if (username == undefined) return false
            try {
                const data = await reqSalt(username)
                salt = data.salt
                proxyGlobalData.salt = salt
            } catch (error) {
                return false
            }
        }
        //根据现有用户名及密码尝试登录
        const passwordHash = bcrypt.hashSync(password, salt)
        try {
            await requests.post("/users/login", { username, password: passwordHash })
            if (checkToken()) {
                globalCache.loggedIn = true
                tried = false
                return true
            } else return false
        } catch (error) {
            //登录失败则尝试移除本地salt后重新登录
            proxyGlobalData.salt = ""
            if (tried === true) {
                return false
            } else {
                tried = true
                return reqLogin(username, password)
            }
        }
    } catch (error) {
        //用户名对应的salt不存在
        console.log("reqLogin error", error)
        globalCache.loggedIn = false
        return false
    }
}

//注销当前登录，服务端封禁当前token
export const reqLogout = (): Promise<void> => requests.get("/users/logout")

//初始化时更新用户
export const reqModify = async (
    username: string,
    password: string,
    salt: string,
): Promise<true | Error> => requests.post("/users/modify", { username, password, salt })

//检查是否为初始化状态
export const reqIsFirst = async (): Promise<boolean> => {
    try {
        await requests.get("/users/first")
        proxyGlobalData.first = true
        return true
    } catch (error) {
        proxyGlobalData.first = false
        return false
    }
}

export type sortBy =
    | "path"
    | "title"
    | "id"
    | "order"
    | "rank"
    | "like"
    | "add"
    | "air"
    | "creat"
    | "update"
    | "change"
export interface LibQuery {
    libName?: string
    sort?: Array<"asc" | "desc">
    sortBy?: Array<sortBy> | "random"
    range?: string
    path?: string
}
export interface ReqLibrary {
    libName: string
    path?: string
    start?: number
    end?: number
    sort?: Array<"asc" | "desc">
    sortBy?: Array<sortBy> | "random"
    search?: string
}
//获取资源库
export async function reqLibrary({
    libName = "",
    path = "",
    start = 0,
    end = 20,
    sort = ["asc"],
    sortBy = ["title", "order"],
    search,
}: ReqLibrary): Promise<libraryData> {
    return (await requests.get(`/library/lib`, {
        decompress: true,
        params: {
            libName,
            path,
            sort,
            sortBy,
            range: `${start},${end}`,
            search,
        } as LibQuery,
    })) as libraryData
}

export interface itemQuery {
    display: "video" | "file"
    libName: string
    filePath: string
}
export interface VideoQueryParams extends itemQuery {
    display: "video"
    filePath: string
    bitrate?: number
    autoBitrate?: boolean
    resolution?: string
    method?: "direct" | "transcode"
}

export interface ItemSrc {
    url: string
    type: string
}
export interface VideoSrc extends ItemSrc {
    fontsList?: Array<fontInfo>
    subtitleList?: Array<subInfo>
    chapters: Array<chaptersInfo>
}

export interface subInfo {
    source: string
    codec: string
    url: string
    details?: object
    subStreamIndex?: number
    type?: string
}
export interface fontInfo {
    url: string
    name: string
}
export interface chaptersInfo {
    title: string
    start: number
}
//item资源请求
export async function reqItemSrc(data: VideoQueryParams): Promise<VideoSrc>
export async function reqItemSrc(data: itemQuery): Promise<ItemSrc>
export async function reqItemSrc(data: itemQuery | VideoQueryParams): Promise<ItemSrc | VideoSrc> {
    return requests.post(`/library/item`, data)
}

export const reqStaticCache = async (url: string): Promise<string> => {
    const cache = (await assetsCache.getItem(url)) as unknown as Blob
    if (cache) {
        return URL.createObjectURL(cache)
    } else {
        const { data } = await axios.get(url, { responseType: "blob" })
        if (data instanceof Blob) {
            await assetsCache.setItem(url, data)
            return URL.createObjectURL(data)
        }
        return Promise.reject(typeof data)
    }
}

//停止转码请求
export const reqStopTranscode = async (taskId: string): Promise<{}> =>
    requests.get(`/video/clearVideoTemp?taskId=${taskId}`)

export interface settings {
    server: {
        serverPort: number
        ffmpegPath: string
        tempPath: string
        cert: string
        key: string
        debug: boolean
    }
    transcode: {
        platform: string
        bitrate: number
        autoBitrate: boolean
        advAccel: boolean
        encode: string
        customInputCommand: string
        customOutputCommand: string
    }
}
//获取服务端配置
export const reqSettings = async (): Promise<settings> => requests.get(`/settings`)

//修改服务端配置
export const reqChangeSettings = async (newSettings: settings): Promise<void> =>
    requests.post(`/settings`, newSettings)

export interface libraryInfo {
    name: string
    rootPath: string
    category: string
    mapFile: object
    mapDir: object
    config: object
}
//获取资源库列表
export const reqLibraryList = async (): Promise<libraryInfo[]> => requests.get(`/library/manager`)

export interface ScraperResult {
    title?: string //前端展示的名称，刮削时产生，默认为不带后缀的文件名或文件夹名
    result?: resultType
    display?: string //result为item时必要，与前端展示功能对应，当前可用:"video"
    poster?: string //海报图绝对路径
    parentTitle?: string //用于判断box类的title
    [key: string]: unknown //预留，用于不同result时的附加刮削信息，具体展示由前端决定
}
export interface MapResult extends ScraperResult {
    title: string
    path: string
    result: resultType
    order: number
    locked?: boolean //用于防止覆写用户设定
}
export interface MapRule {
    [key: keyof MapResult]: string | string[]
}
export interface libraryConfig {
    library: {}
    [scraperName: string]: {
        overwrite?: boolean
    }
}
export interface ScraperConfig {
    rootPath: string
    name: string
    category: "video" | "anime"
    mapFile?: MapRule
    mapDir?: MapRule
    config?: libraryConfig
}
//资源库相关
//新建
export const reqAddLibrary = async (scraperConfig: ScraperConfig): Promise<void> =>
    requests.post(`/library/manager`, scraperConfig)
// 删除
export const reqDeleteLibrary = async (libName: string): Promise<void> =>
    requests.delete(`/library/manager`, { data: { libName } })
// 更新
export const reqUpdateLibrary = async (libName: string, targetPath: string): Promise<void> =>
    requests.patch(`/library/manager`, { libName, targetPath })
// 修复
export const reqReapirLibrary = async (libName: string): Promise<void> =>
    requests.put(`/library/manager`, { libName })
// 修改映射规则
export const reqEditMapRule = async (params: {
    name: string
    mapFile?: MapRule
    mapDir?: MapRule
}): Promise<void> => requests.put(`/library/mapRule`, params)
