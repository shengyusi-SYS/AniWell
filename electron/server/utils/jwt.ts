import jwt from 'jsonwebtoken'
import init from '@s/utils/init'
import { UserData } from '@s/store/users'
import bannedToken from '@s/store/bannedToken'
const issuer = init.appName + ' ' + init.version
const secretOrPrivateKey = init.proxySettings.ssl.key
export interface userInfoPayload {
    username: string
    UID: string
    alias: string
    administrator: boolean
    access: object
}

export const sign = (payload: string | object | Buffer, expiresIn = '6h') =>
    jwt.sign(payload, secretOrPrivateKey, {
        expiresIn,
        algorithm: 'RS256',
        issuer,
    })
export const signRefreshToken = ({ username, UID, alias, administrator, access }: UserData) =>
    jwt.sign({ username, UID, alias, administrator, access }, secretOrPrivateKey, {
        expiresIn: '30 days',
        algorithm: 'RS256',
        issuer,
        audience: UID,
    })
export const signAccessToken = ({ username, UID, alias, administrator, access }: UserData) =>
    jwt.sign({ username, UID, alias, administrator, access }, secretOrPrivateKey, {
        expiresIn: '3h',
        algorithm: 'RS256',
        issuer,
        audience: UID,
    })
export const verifyToken = (token: string): userInfoPayload | false => {
    try {
        if (!token) {
            return false
        }
        if (bannedToken.has(token)) {
            return false
        }
        const info = jwt.verify(token, secretOrPrivateKey, { issuer })

        if (typeof info === 'object') {
            return info as userInfoPayload
        } else {
            return false
        }
    } catch (error) {
        console.log(error)

        return false
    }
}
export const verify = (token: string) => jwt.verify(token, secretOrPrivateKey, { issuer })
