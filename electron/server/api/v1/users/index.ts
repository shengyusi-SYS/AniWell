import { logger } from '@s/utils/logger'
import express, { NextFunction, Response, Request } from 'express'
const router = express.Router()
import multer from 'multer'
const upload = multer()
import { UserData, users } from '@s/store/users'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken, signRefreshToken, verify, verifyToken } from '@s/utils/jwt'
import bannedToken from '@s/store/bannedToken'
import { session } from 'electron'
import settings from '@s/store/settings'

router.get('/logout', async (req, res) => {
    try {
        bannedToken.add(req.cookies.refreshToken)
        res.end()
    } catch (error) {
        res.status(400).json({ error: '令牌错误', alert: true })
    }
})

router.get('/login', async (req, res, next) => {
    const { refreshToken } = req.cookies
    if (verifyToken(refreshToken)) {
        res.status(200).end()
    } else {
        res.status(403).json({ error: '请重新登陆', alert: true })
    }
})

interface IPinfo {
    ip: string
    tryTimes: number
    release?: number
}
class CountIP {
    store: IPinfo[] = []
    check = (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip
        const exist = this.store.find((v) => v.ip === ip)
        if (exist) {
            if (exist.tryTimes >= 20) {
                if (exist.release) {
                    if (Date.now() >= exist.release) {
                        return next()
                    } else {
                        res.status(403).json({
                            error: 'ip封禁中,请稍后重试,或重启服务端',
                            alert: true,
                        })
                        return
                    }
                } else {
                    exist.release = Date.now() + 1000 * 3600 * 6
                    res.status(403).json({
                        error: '错误过多,请6小时后重试,或重启服务端',
                        alert: true,
                    })
                    return
                }
            } else exist.tryTimes++
        } else {
            this.store.push({ ip, tryTimes: 1 })
        }
        next()
    }
    release = (req: Request) => {
        const targetIndex = this.store.findIndex((v) => v.ip === req.ip)
        if (targetIndex >= 0) {
            this.store.splice(targetIndex, 1)
        }
    }
}
const countIP = new CountIP()

router.get('/salt', countIP.check, async (req, res, next) => {
    const username = req.query?.username
    if (typeof username === 'string') {
        const user = users.getUser({ username })
        if (user !== false) {
            const salt = user.salt
            res.json({ salt })
            return
        } else {
            res.status(404).json({ error: '用户名不存在', alert: true })
        }
    } else {
        res.status(400).json({ error: '请求错误' })
    }
})

router.post('/login', countIP.check, upload.none(), async (req, res, next) => {
    const { refreshToken } = req.cookies
    if (verifyToken(refreshToken)) {
        res.status(200).end()
        countIP.release(req)
        return
    }
    const electronReq = req.headers.electron
    const { username, password } = req.body
    if (typeof username === 'string' && typeof password === 'string') {
        try {
            const verify = await users.verify(username, password)
            const user = users.getUser({ username })
            if (verify === true && user) {
                logger.info('user login', user)

                res.cookie('refreshToken', signRefreshToken(user), {
                    maxAge: 1000 * 3600 * 24 * 30,
                    httpOnly: true,
                    secure: !settings.server.dev,
                })
                res.status(200).end()
                countIP.release(req)
                return
            } else {
                res.status(401).json({ error: '用户名或密码错误', alert: true })
            }
        } catch (error) {
            res.status(401).json({ error: '用户名或密码错误', alert: true })
        }
    } else {
        res.status(400).json({ error: '请求错误' })
    }
})

router.post('/signup', upload.none(), async (req, res, next) => {
    const {
        username,
        password,
        alias,
        salt,
        administrator = false,
        access = { admin: false },
    } = req.body as UserData
    if (!username || !password || !salt) {
        res.status(400).json({ error: '请求错误' })
    } else {
        //TODO：验证添加用户的权限
        try {
            const user: UserData = {
                username,
                UID: uuidv4(),
                password,
                alias,
                salt,
                administrator,
                access,
            }
            users.addUser(user)
        } catch (error) {
            logger.error('/signup', error)
            res.status(500).json({ error: '/signup 服务器错误' })
        }
    }
})

router.get('/first', (req, res) => {
    if (users.first === true) {
        res.status(200).end()
    } else {
        res.status(503).json({ error: '非初次使用' })
    }
})

if (users.first === true) {
    router.post('/modify', async (req, res, next) => {
        if (users.first === true) {
            try {
                const { username, password, salt } = req.body
                const { refreshToken } = req.cookies
                if (!username || !password || !salt) {
                    res.status(400).json({ error: '请求错误' })
                    return
                }

                await users.firstSignUp(req.body as UserData)
                const user = users.getUser({ username })
                if (user !== false) {
                    bannedToken.add(refreshToken)
                    res.cookie('refreshToken', signRefreshToken(user), {
                        maxAge: 1000 * 3600 * 24 * 30,
                        httpOnly: true,
                        secure: !settings.server.dev,
                    })
                        .status(200)
                        .end()
                    users.first = false
                }
                return
            } catch (error) {
                logger.error('/modify', error)
                res.status(500).json({ error: '/modify 服务器错误' })
            }
        } else {
            res.status(500).json({ error: '已完成初始化' })
        }
    })
}

export default router
