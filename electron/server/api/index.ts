import { logger } from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import users from './users'
import hlsRequestHandler from '@s/modules/handleVideoRequest/hlsRequestHandler'
import directPlayHandler from '@s/modules/handleVideoRequest/directPlayHandler'
import { sign, verify } from '@s/utils/jwt'

//会随新ui换成多级路由

router.use('/', async (req, res, next) => {
    if (req.path.includes('/users/login')) {
        next()
    } else {
        try {
            const token = ''
            const tokenInfo = verify(token)
        } catch (error) {
            res.status(401).send(error)
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

router.use('/output', hlsRequestHandler.output)

router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)

router.use('/directPlay', directPlayHandler.directPlay)

export default router
