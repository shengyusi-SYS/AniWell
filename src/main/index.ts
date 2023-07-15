import Server from "@s/index"
import { logger } from "@s/utils/logger"
import settings from "@s/store/settings"
import { app, shell, BrowserWindow, ipcMain, Tray as EleTray } from "electron"
import { join, resolve as pathResolve } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
// import Server from "../server?nodeWorker"
import type { eventMessage } from "@s/utils/nodeWorker"
import { invokeEvent } from "@s/utils/nodeWorker"
import Tray from "./modules/tray"
import vueDevtools from "./modules/vueDevtools"
let server = Server()
// const serverEvents = {}
// server.on("message", (msg: eventMessage) => {
//     if (serverEvents[msg.event] && serverEvents[msg.event] instanceof Function) {
//         serverEvents[msg.event](msg.data)
//     } else {
//         console.log("msg", msg)
//     }
// })
// const invokeServer = invokeEvent(server)

let mainWindow: BrowserWindow

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        title: "AniWell",
        width: 1920,
        height: 1080,
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: "hidden",

        ...(process.platform === "linux" ? { icon } : {}),
        webPreferences: {
            preload: pathResolve(
                __dirname,
                import.meta.env.DEV ? "../preload/index.js" : "../preload/index.js",
            ),
            contextIsolation: true,
        },
    })

    mainWindow.on("ready-to-show", () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: "deny" }
    })

    if (import.meta.env.MAIN_VITE_REMOTE !== "true") {
        // HMR for renderer base on electron-vite cli.
        // Load the remote URL for development or the local html file for production.
        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            // mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
            mainWindow.loadURL(server.host)

            // invokeServer("ready").then(({ host }) => {
            //     if (typeof host === "string") {
            // mainWindow.loadURL(server.host)
            //     }
            // })
        } else {
            // mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
            // invokeServer("ready").then(({ host }) => {
            //     if (typeof host === "string") {
            mainWindow.loadURL(server.host)

            //     }
            // })
        }
    }
}

let theTray: EleTray | undefined

app.commandLine.appendSwitch("--ignore-certificate-errors", "true")
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron")
    theTray = Tray({ app, createWindow })

    if (import.meta.env.DEV === true) {
        //加载vue.js.devtools
        await vueDevtools()
    }

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    //electron环境下获取服务器端口号
    ipcMain.handle("getServerPort", () => settings.server.serverPort)

    ipcMain.on("openLocalFolder", (event, targetPath) => {
        shell.openPath(pathResolve(targetPath))
    })

    ipcMain.on("closeWindow", (event) => {
        mainWindow.close()
    })

    ipcMain.on("refreshWindow", (event) => {
        mainWindow.reload()
    })

    ipcMain.on("test", async (event, data) => {
        console.log(data)
        // const { test } = await import('@s/test')
        // test()
    })
    ipcMain.handle("test1", () => "test1")
    setTimeout(() => {
        mainWindow.webContents.send("test2", "test2")
    }, 2000)
    ipcMain.on("test2", (_event, value) => {
        console.log(value)
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    mainWindow = undefined
    // if (process.platform !== "darwin") {
    //     app.quit()
    // }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
