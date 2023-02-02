import { logger } from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import v1 from './v1'
import localFile from './localFile'
//会随新ui换成多级路由

import fs from 'fs'
import path from 'path'
import settings from '@s/store/settings'
import got from 'got'
import cookieParser from 'cookie-parser'
const app = express()
import https from 'https'
import { CookieJar } from 'tough-cookie'
const cookieJar = new CookieJar()
import history from 'connect-history-api-fallback'
import proxyMw from 'http-proxy-middleware'
const proxy = proxyMw.createProxyMiddleware

let SID: string
let cookieTimer: NodeJS.Timeout
let checkCookie = true
const bannedSIDs: string[] = []

//权限验证预处理
app.use('/api', (req, res, next) => {
    // logger.debug('/api',req.path);
    try {
        if (
            req.path == '/v2/auth/login' ||
            /^\/v1/.test(req.path) ||
            /^\/localFile\/output\//i.test(req.path)
        ) {
            // logger.debug('/v2/auth/login', req.headers)
            next()
        } else if (!req.cookies && !req.query.cookie) {
            throw new Error('Fails.')
        } else {
            let newSID
            if (req.cookies?.SID) {
                newSID = req.cookies.SID
            } else if (req.query?.cookie) {
                newSID = (req.query.cookie as string).replace('SID=', '')
            } else {
                throw new Error('Fails.')
            }

            if (bannedSIDs.includes(newSID)) {
                logger.error('/api', 'bannedSIDs')
                throw new Error('Fails.')
            } else if (SID != newSID) {
                checkCookie = true
                SID = newSID
                cookieJar.setCookieSync(`SID=${newSID}`, settings.get('qbHost'))
            }
            next()
        }
    } catch (error) {
        if (req.path != '/v2/sync/maindata') {
            logger.error('/api', req.path, req.headers, req.cookies, error)
        }
        res.status(403).send(error)
    }
})

//权限验证
app.use('/api/localFile', async (req, res, next) => {
    try {
        res.header('Access-Control-Allow-Origin', '*')
        if (settings.get('share') && /^\/localFile\/output\//i.test(req.path)) {
            next()
            return
        }
        if (/^\/v1/.test(req.path)) {
            next()
            return
        }
        if (checkCookie) {
            logger.info('/api/localFile', 'check')
            const result = (
                await got({
                    url: `${settings.get('qbHost')}/api/v2/auth/login`,
                    method: 'POST',
                    cookieJar,
                })
            ).body
            if (result == 'Ok.') {
                checkCookie = false
                clearTimeout(cookieTimer)
                cookieTimer = setTimeout(() => {
                    checkCookie = true
                }, 30 * 60 * 1000)
                next()
            } else {
                logger.info('/api/localFile', 'banned', SID)
                bannedSIDs.push(SID)
                throw new Error('Fails.')
            }
        } else {
            next()
        }
    } catch (error) {
        logger.error('/api/localFile', error)
        res.status(403).send(error)
    }
})

router.use('/v1', v1)

router.use('/localFile', localFile)

export default router
