import express from 'express'
const router = express.Router()
import { users } from '@s/store/users'
import { sign, verify } from '@s/utils/jwt'
router.get('/salt', async (req, res, next) => {
    const userName = req.query?.userName
    if (typeof userName === 'string') {
        try {
            const salt = users.getUser(userName).salt
            res.json({ salt })
        } catch (error) {
            res.status(404).json({ error: '用户名不存在' })
        }
    } else {
        res.status(400).json({ error: '请求错误' })
    }
})
router.post('/token', async (req, res, next) => {
    const { userName, password } = req.body
    if (typeof userName === 'string' && typeof password === 'string') {
        const verify = await users.verify(userName, password)
        if (verify === true) {
            res.cookie('refreshToken', sign(userName), {
                maxAge: 1000 * 3600 * 24 * 30,
                httpOnly: true,
                secure: true,
            })
                .cookie('accessToken', sign(userName), {
                    maxAge: 1000 * 60,
                    httpOnly: true,
                    secure: true,
                })
                .status(200)
                .send({ success: true })
            return
        } else {
            res.status(401).json({ error: '用户名或密码错误' })
        }
    } else {
        res.status(400).json({ error: '请求错误' })
    }
})
export default router
