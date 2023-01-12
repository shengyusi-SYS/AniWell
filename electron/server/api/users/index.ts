import express from 'express'
const router = express.Router()
import { sign, verify } from '@s/utils/jwt'
import multer from 'multer'
const upload = multer()
router.use('/modify', async (req, res, next) => {
    console.log(req)
    res.send({})
})

router.post('/login', upload.none(), async (req, res, next) => {
    const { userName, password, longTime } = req.body
    if (!userName || !password) {
        res.status(401).send({ error: '用户名或密码为空' })
        return
    }
    const check = (userName, password) => {
        console.log('/login-check')
        return true
    }
    const result = check(userName, password)
    if (result === true) {
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
    }
})
export default router
