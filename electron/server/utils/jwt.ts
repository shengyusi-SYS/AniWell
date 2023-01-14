import jwt from 'jsonwebtoken'
import init from '@s/utils/init'
import { UserData } from '@s/store/users'
const issuer = init.appName + ' ' + init.version
export const sign = (UID: string, expiresIn = '6h') =>
    jwt.sign({ UID }, init.proxySettings.ssl.key, {
        expiresIn,
        algorithm: 'RS256',
        issuer,
        audience: UID,
    })
export const signRefreshToken = (userData: UserData) =>
    jwt.sign(userData, init.proxySettings.ssl.key, {
        expiresIn: '30 days',
        algorithm: 'RS256',
        issuer,
        audience: userData.UID,
    })
export const signAccessToken = (payload: object) =>
    jwt.sign(payload, init.proxySettings.ssl.key, {
        expiresIn: '30m',
        algorithm: 'RS256',
        issuer,
    })
export const verify = (token: string) => jwt.verify(token, init.proxySettings.ssl.key, { issuer })
