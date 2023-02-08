import requests from './request'
import bcrypt from 'bcryptjs'
import { CardData } from '@v/stores/library'
// export const req = async () => requests.post('')
let tried = false

export const reqSalt = (username: string): Promise<{ salt: string } | Error> =>
    requests.get('/users/salt?username=' + username)

export const reqLogin = async (username: string, password: string): Promise<boolean> => {
    try {
        let salt = localStorage.getItem('salt')
        if (!salt) {
            const data = await reqSalt(username)
            if (!(data instanceof Error)) {
                salt = data.salt
                localStorage.setItem('salt', salt)
            } else return false
        }
        const passwordHash = bcrypt.hashSync(password, salt)
        try {
            await requests.post('/users/login', { username, password: passwordHash })
            sessionStorage.setItem('loggedIn', 'true')
            tried = false
            return true
        } catch (error) {
            localStorage.removeItem('salt')
            if (tried === true) {
                return false
            } else {
                tried = true
                return reqLogin(username, password)
            }
        }
    } catch (error) {
        sessionStorage.setItem('loggedIn', 'false')
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
        localStorage.setItem('first', 'true')
        return true
    } catch (error) {
        localStorage.setItem('first', 'false')
        return false
    }
}

export const reqOldLibrary = async () => requests.get('/library/old')

export const reqLibrary = async (
    catagory: string,
    itemId = '',
    params = { start: 0, end: 20 },
): Promise<CardData> =>
    requests.get(`/library/${catagory}?itemId=${itemId}&range=${params.start},${params.end}`)

export const reqLibraryItem = async (data): Promise<{}> => requests.post(`/library/item`, data)

export const reqStopTranscode = async (): Promise<{}> => requests.post(`/video/clearVideoTemp`)

export * from './old'
