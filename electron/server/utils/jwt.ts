import jwt from 'jsonwebtoken'
import init from '@s/utils/init'
export const sign = (userName: string, expiresIn = '6h') =>
    jwt.sign({ userName }, init.proxySettings.ssl.key, {
        expiresIn,
        algorithm: 'RS256',
        issuer: 'FileServer',
        audience: userName,
    })
export const verify = (token: string) =>
    jwt.verify(token, init.proxySettings.ssl.key, { issuer: 'FileServer' })
