import { log4js, httpLogger, logger, syncLogger, clientLogger } from "./utils/logger"
process.on("uncaughtException", function (err) {
    logger.error("Caught exception !!!", err)
})
import fs, { readdirSync } from "fs"
import { join, resolve } from "path"
import settings from "@s/store/settings"
logger.info("settings", settings)
import init from "./utils/init"
const { ssl } = init
import cookieParser from "cookie-parser"
import express from "express"
const app = express()
import spdy from "spdy"
import router from "@s/api"
import Io from "./api/v1/socket"
import { parentPort } from "worker_threads"
// import { eventMessage } from "./functions/event"
import { createProxyMiddleware } from "http-proxy-middleware"
import { inferAsyncReturnType, initTRPC } from "@trpc/server"
import * as trpcExpress from "@trpc/server/adapters/express"
import { router as trpcRouter, createContext } from "@s/trpc"
import { appRouter } from "./trpc/router"

function serve() {
    app.use(log4js.connectLogger(httpLogger, { level: "trace" }))
    app.use(cookieParser())
    app.use(
        "/trpc",
        trpcExpress.createExpressMiddleware({
            router: appRouter,
            createContext,
        }),
    )
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    app.use("/api", router)

    try {
        const wwwroot = resolve(__dirname, import.meta.env.DEV ? "./out/renderer" : "../renderer")
        logger.info("wwwroot", wwwroot)
        import.meta.env.DEV
            ? app.use(
                  createProxyMiddleware({
                      target: process.env["ELECTRON_RENDERER_URL"],
                      secure: false,
                      ssl: ssl,
                  }),
              )
            : app.use(express.static(wwwroot))
    } catch (error) {
        logger.error("wwwroot", error)
    }

    try {
        const http2Server = spdy.createServer(ssl, app)
        http2Server.listen(settings.server.serverPort, () => {
            logger.info(
                "server start",
                `HTTP2 Server is running on: https://localhost:${settings.server.serverPort}`,
            )
            parentPort?.postMessage({
                event: "ready",
                data: { host: `https://localhost:${settings.server.serverPort}` },
            })
        })

        Io.init(http2Server)
    } catch (error) {
        logger.error("start server", error)
    }
    return {
        app,
        host: `https://localhost:${settings.server.serverPort}`,
    }
}

// parentPort?.on("message", (msg: eventMessage) => {
//     if (msg.event === "ready") {}
// })

export default serve
