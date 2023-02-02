import requests from './request'
import bcrypt from 'bcryptjs'
// export const req = async () => requests.post('')

export const reqSalt = (username: string): Promise<{ salt: string }> =>
    requests.get('/users/salt?username=' + username)

export const reqLogin = async (username: string, password: string) => {
    try {
        const salt = (await reqSalt(username)).salt
        const passwordHash = bcrypt.hashSync(password, salt)
        await requests.post('/users/login', { username, password: passwordHash })
        return true
    } catch (error) {
        return false
    }
}

export const reqModify = async (username: string, password: string, salt: string) =>
    requests.post('/users/modify', { username, password, salt })

export * from './old'
