import express from 'express'
const router = express.Router()
import login from './login'
import multer from 'multer'
const upload = multer()
import { UserData, users } from '@s/store/users'
import { v4 as uuidv4 } from 'uuid'

router.use('/modify', async (req, res, next) => {
    console.log(req)
    res.send({})
})

router.use('/login', upload.none(), login)

router.post('/signup', upload.none(), async (req, res, next) => {
    const {
        userName,
        password,
        alias,
        salt,
        administrator = false,
        access = { admin: false },
    } = req.body as UserData
    if (!userName || !password || !salt) {
        res.status(400).json({ error: '请求错误' })
    } else {
        //TODO：验证添加用户的权限
        try {
            users.addUser(userName, {
                UID: uuidv4(),
                password,
                alias,
                salt,
                administrator,
                access,
            })
        } catch (error) {
            res.status(500).json({ error: '服务器错误' })
        }
    }
})

export default router
