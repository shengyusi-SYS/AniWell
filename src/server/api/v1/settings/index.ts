import settings, { Settings } from "@s/store/settings"
import { deepMerge, toNumberDeep } from "@s/utils"
import { logger } from "@s/utils/logger"
import express from "express"
const router = express.Router()

router.get("/", (req, res) => {
    res.json(settings)
})
router.post("/", (req, res) => {
    const newSettings: Settings = toNumberDeep(req.body)
    delete newSettings.server.dev
    try {
        deepMerge(settings, req.body)
        res.end()
    } catch (error) {
        logger.error("/v1/newSettings", error)
        res.status(400).json({ error: error.message, alert: true })
    }
})

export default router
