import express from 'express'
const router = express.Router()
//会随新ui换成多级路由

router.use('/api/localFile/output', async (req, res, next) => {
    console.log('/api/localFile/output')
    const { hlsRequestHandler } = await import('@s/components/handleVideoRequest/hlsRequestHandler')
    const output = hlsRequestHandler.output
    output(req, res)
})

router.use('/api/localFile/clearVideoTemp', async (req, res, next) => {
    console.log('/api/localFile/clearVideoTemp')
    const { hlsRequestHandler } = await import('@s/components/handleVideoRequest/hlsRequestHandler')
    const clearVideoTemp = hlsRequestHandler.clearVideoTemp
    clearVideoTemp(req, res)
})

router.use('/api/localFile/directPlay', async (req, res, next) => {
    console.log('/api/localFile/directPlay')
    const { directPlayHandler } = await import('@s/components/handleVideoRequest/directPlayHandler')
    const directPlay = directPlayHandler.directPlay
    directPlay(req, res)
})

export default router
