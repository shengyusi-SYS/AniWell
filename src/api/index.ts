import requests from './request'
import bcrypt from 'bcryptjs'
import { libraryData } from '@v/stores/library'
import { globalCache, proxyGlobalData } from '@v/stores/global'
import { io } from 'socket.io-client'

export const socket = io()

socket.on('connect', () => {
    console.log(socket.id)
})
socket.on('data', (data) => {
    console.log(data)
})
socket.on('time', (time) => {
    const delay = Date.now() - time
    globalCache.serverLog.info(delay)
})
socket.on('log', (log) => {
    globalCache.serverLog.info(log)
})

export const clientLog = (...args: any[]) => socket.emit('clientLog', args.join(' '))
setTimeout(() => {
    clientLog('dadada')
}, 2222)
export const reqSalt = (username: string): Promise<{ salt: string } | Error> =>
    requests.get('/users/salt?username=' + username)

const checkToken = () => {
    document.cookie = 'refreshToken=refreshToken;path=/;'
    return !/refreshToken=refreshToken/.test(document.cookie)
}
let tried = false
export const reqLogin = async (username?: string, password?: string): Promise<boolean> => {
    try {
        //检查是否已获得refreshToken或是自动登录
        if (checkToken() || (!username && !password)) {
            //尝试仅通过cookie验证,失败则走常规流程
            try {
                await requests.post('/users/login')
                globalCache.loggedIn = true
                return true
            } catch (error) {
                if (!username && !password) {
                    return false
                }
            }
        }
        //请求用户名对应的salt,如果本地存储有salt则尝试以本地salt登录
        let salt = proxyGlobalData.salt
        if (!salt) {
            const data = await reqSalt(username)
            if (!(data instanceof Error)) {
                salt = data.salt
                proxyGlobalData.salt = salt
            } else return false
        }
        //根据现有用户名及密码尝试登录
        const passwordHash = bcrypt.hashSync(password, salt)
        try {
            await requests.post('/users/login', { username, password: passwordHash })
            if (checkToken()) {
                globalCache.loggedIn = true
                tried = false
                return true
            } else return false
        } catch (error) {
            //登录失败则尝试移除本地salt后重新登录
            proxyGlobalData.salt = ''
            if (tried === true) {
                return false
            } else {
                tried = true
                return reqLogin(username, password)
            }
        }
    } catch (error) {
        //用户名对应的salt不存在
        console.log('reqLogin', error)
        globalCache.loggedIn = false
        return false
    }
}

export const reqModify = async (
    username: string,
    password: string,
    salt: string,
): Promise<true | Error> => requests.post('/users/modify', { username, password, salt })

export const reqIsFirst = async (): Promise<boolean> => {
    try {
        await requests.get('/users/first')
        proxyGlobalData.first = true
        return true
    } catch (error) {
        proxyGlobalData.first = false
        return false
    }
}

export type sortBy = 'path' | 'title' | 'id' | 'order' | 'rank' | 'like'
export interface LibQuery {
    libName?: string
    sort?: Array<'asc' | 'desc'>
    sortBy?: Array<sortBy> | 'random'
    range?: string
    path?: string
}
export interface ReqLibrary {
    libName: string
    path?: string
    start?: number
    end?: number
    sort?: Array<'asc' | 'desc'>
    sortBy?: Array<sortBy> | 'random'
}
/*  */
export async function reqLibrary({
    libName = '',
    path = '',
    start = 0,
    end = 20,
    sort = ['asc'],
    sortBy = ['title'],
}: ReqLibrary): Promise<libraryData> {
    return (await requests.get(`/library/lib`, {
        decompress: true,
        params: {
            libName,
            path,
            sort,
            sortBy,
            range: `${start},${end}`,
        } as LibQuery,
    })) as libraryData
}

export interface itemQuery {
    display: 'video' | 'file'
    libName: string
    filePath: string
}
export interface VideoQueryParams extends itemQuery {
    display: 'video'
    filePath: string
    bitrate?: number
    autoBitrate?: boolean
    resolution?: string
    method?: 'direct' | 'transcode'
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
export async function reqItemSrc(data: VideoQueryParams): Promise<VideoSrc>
export async function reqItemSrc(data: itemQuery): Promise<ItemSrc>
export async function reqItemSrc(data: itemQuery | VideoQueryParams): Promise<ItemSrc | VideoSrc> {
    return requests.post(`/library/item`, data)
}

export const reqStopTranscode = async (taskId: string): Promise<{}> =>
    requests.get(`/video/clearVideoTemp?taskId=${taskId}`)

export const reqPoster = async (path: string): Promise<Blob> =>
    requests.get(`/library/poster?path=` + encodeURIComponent(path), {
        responseType: 'blob',
    })
