import express from 'express'
const router = express.Router()
import users from './users'
import hlsRequestHandler from '@s/components/handleVideoRequest/hlsRequestHandler'
import directPlayHandler from '@s/components/handleVideoRequest/directPlayHandler'
//会随新ui换成多级路由

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
