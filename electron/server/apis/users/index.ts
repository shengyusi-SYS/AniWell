import express from 'express'
const router = express.Router()
router.use('/modify', async (req, res, next) => {
    console.log(req)
    res.send({})
})
export default router
