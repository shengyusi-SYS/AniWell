import { logger } from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import users from './users'

import { sign, verify } from '@s/utils/jwt'

//会随新ui换成多级路由

router.use('/', async (req, res, next) => {
    if (/^\/users\/login/.test(req.path)) {
        next()
    } else {
        try {
            const token = ''
            const tokenInfo = verify(token)
        } catch (error) {
            res.status(401).json({ error })
        }
    }
})

router.use('/users', users)

router.use('/server', async (req, res, next) => {
    next()
})

router.use('/video', async (req, res, next) => {
    next()
})

router.use('/library', async (req, res, next) => {
    next()
})

export default router
