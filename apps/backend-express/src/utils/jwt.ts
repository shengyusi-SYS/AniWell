import jwt from 'jsonwebtoken'
import init from '@s/utils/init'
import { UserData } from '@s/store/users'
import bannedToken from '@s/store/bannedToken'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'

const issuer = init.APPNAME + ' ' + init.VERSION
const secretOrPrivateKey = init.ssl.key
export interface userInfoPayload {
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
export const signRefreshToken = ({ UID, alias, administrator, access }: UserData) =>
    jwt.sign({ UID, alias, administrator, access }, secretOrPrivateKey, {
        expiresIn: '30 days',
        algorithm: 'RS256',
        issuer,
        audience: UID,
    })
export const signAccessToken = ({ UID, alias, administrator, access }: UserData) =>
    jwt.sign({ UID, alias, administrator, access }, secretOrPrivateKey, {
        expiresIn: '3h',
        algorithm: 'RS256',
        issuer,
        audience: UID,
    })
export const verifyToken = (token: string): userInfoPayload | false => {
    try {
        if (!token || token === 'refreshToken') {
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
        logger.debug(token, error)

        return false
    }
}
export const verify = (token: string) => jwt.verify(token, secretOrPrivateKey, { issuer })
