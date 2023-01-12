import express from 'express'

const router = express.Router()
router.use('/' /* output */, async (req, res) => {
    console.log('/')
})

export default router
