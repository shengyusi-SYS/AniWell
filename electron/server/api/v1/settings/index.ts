import settings from '@s/store/settings'
import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
    res.json(settings)
})
router.post('/', (req, res) => {
    console.log(req.body)
    res.end()
})

export default router
