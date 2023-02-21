import requests from './request'
import bcrypt from 'bcryptjs'
import { CardData } from '@v/stores/library'
import { globalCache, proxyGlobalData } from '@v/stores/global'
import { io } from 'socket.io-client'

export const socket = io()

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

export const reqOldLibrary = async () => requests.get('/library/old')

export const reqLibrary = async (
    catagory: string,
    itemId = '',
    params = { start: 0, end: 20 },
): Promise<CardData> => {
    const res = await requests.get(
        `/library/${catagory}?itemId=${itemId}&range=${params.start},${params.end}`,
        {
            // responseType: 'json',
            decompress: true,
        },
    )
    console.log(res)
    return res
}

export interface VideoQueryParams {
    filePath?: string
    resourceId?: string
    bitrate?: number
    autoBitrate?: boolean
    resolution?: string
    method?: string
}
export interface VideoSrc {
    url: string
    type: string
    sub?: Buffer
    fontsList?: Array<string>
    subtitleList: Array<subInfo>
}
export interface subInfo {
    source: string
    codec: string
    url: string
    details?: object
    subStreamIndex?: number
    type?: string
}

export const reqLibraryItem = async (data: VideoQueryParams): Promise<VideoSrc> =>
    requests.post(`/library/item`, data)

export const reqStopTranscode = async (): Promise<{}> => requests.post(`/video/clearVideoTemp`)

export * from './old'
