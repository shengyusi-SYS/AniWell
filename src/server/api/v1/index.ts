import { logger } from "@s/utils/logger"
import express, { Request, Response } from "express"
const router = express.Router()
import users from "./users"
import library from "./library"
import video from "./video"
import settings from "./settings"
import auth from "@s/modules/auth"
import { signAccessToken, verifyToken } from "@s/utils/jwt"
import { users as usersStore } from "@s/store/users"
import path from "path"
import { access, readdir } from "fs/promises"

// router.post('/debug', (req, res) => {
//     logger.debug('!!!!!!!!!!!!!debug', req.body)
//     res.end()
// })

router.use("/", async (req, res, next) => {
    if (/^\/users\/(login|salt|first)/.test(req.path)) {
        next()
    } else {
        const { refreshToken, accessToken } = req.cookies
        const refreshTokenInfo = verifyToken(refreshToken)
        // const accessTokenInfo = verifyToken(accessToken)
        if (refreshTokenInfo === false) {
            res.status(401).json({ error: "/v1 令牌错误" })
            return
        } else {
            const user = usersStore.getUser({ UID: refreshTokenInfo.UID })
            if (user === false) {
                res.status(401).json({ error: "令牌或用户错误" })
                return
            }
            // if (accessTokenInfo === false) {
            //     res.cookie('accessToken', signAccessToken(user), {
            //         maxAge: 1000 * 60,
            //         httpOnly: true,
            //         secure: true,
            //     })
            // }
            if (auth.isAdmin({ UID: user.UID }) === true) {
                req.user = user
                next()
            } else {
                res.status(401).json({ error: "权限错误" })
            }
        }
    }
})

router.use("/users", users)

router.use("/server", async (req, res, next) => {
    next()
})

router.use("/video", video)

router.use("/library", library)

router.use("/settings", settings)

router.get("/disk", async (req, res) => {
    const targetPath = req.query.targetPath
    if (typeof targetPath === "string") {
        const contentList = []
        const targetPathContent = await readdir(targetPath)
        for (let index = 0; index < targetPathContent.length; index++) {
            const itemPath = targetPathContent[index]
            try {
                await readdir(itemPath)
                contentList.push({ path: itemPath, result: "dir" })
            } catch (error) {
                contentList.push({ path: itemPath, result: "file" })
            }
        }
        res.json(contentList)
    }
})

export default router

// console.log('\r\r\r\n\n\n', import.meta.env, import.meta.env.MODE)
