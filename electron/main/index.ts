// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = app.isPackaged
    ? process.env.DIST
    : join(process.env.DIST_ELECTRON, '../public')
process.env.APPROOT = join(process.env.DIST_ELECTRON, '..')
import '../server'
import { logger } from '@s/utils/logger'
import settings from '@s/store/settings'
import {
    app,
    BrowserWindow,
    shell,
    ipcMain,
    Menu,
    Tray as EleTray,
    session,
    protocol,
} from 'electron'
import Tray from './modules/tray'
import vueDevtools from './modules/vueDevtools'
import { release } from 'os'
import { join, parse, resolve, sep } from 'path'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

app.commandLine.appendSwitch('ignore-certificate-errors')

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
    if (win) {
        win.focus()
        return
    }
    win = new BrowserWindow({
        title: 'FileServer',
        icon: join(process.env.PUBLIC, 'favicon.ico'),
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            // nodeIntegration: true,
            contextIsolation: true,
        },
        width: 1920,
        height: 1080,
        // frame: false,
        // titleBarStyle: 'hidden',
        // titleBarOverlay: false,
        autoHideMenuBar: true,
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        // electron-vite-vue#298
        win.loadURL(url)
        // Open devTool if the app is not packaged
        win.webContents.openDevTools()
    } else {
        // win.loadFile(indexHtml)
        win.loadURL('https://localhost:' + settings.server.serverPort)
    }
    if (import.meta.env.DEV === true) {
        win.blur()
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return { action: 'deny' }
    })
}
let theTray: EleTray | null = null
app.whenReady()
    .then(async () => {
        if (import.meta.env.DEV === true) {
            //加载vue.js.devtools
            // await vueDevtools()
        }

        createWindow()

        theTray = Tray({ app, createWindow })

        //electron环境下获取服务器端口号
        ipcMain.handle('getServerPort', () => settings.server.serverPort)

        ipcMain.on('test', async (event, data) => {
            console.log(data)
            // const { test } = await import('@s/test')
            // test()
        })
        ipcMain.handle('test1', () => 'test1')
        setTimeout(() => {
            win.webContents.send('test2', 'test2')
        }, 2000)
        ipcMain.on('test2', (_event, value) => {
            console.log(value)
        })

        const filePathReg = new RegExp(
            `file:///${join(__dirname, '../../dist').replace(/\\/g, '/')}`,
            'gi',
        )
        const serverBasePath = `https://localhost:${settings.server.serverPort}`
        const diskRootPath = parse(resolve('.')).root.replace('\\', '/')
        // logger.info('interceptHttpProtocol', filePathReg, serverBasePath, diskRootPath)

        protocol.interceptHttpProtocol('file', (request, callback) => {
            //应该用不到了，但先留着
            try {
                const url = request.url
                    .replace(filePathReg, serverBasePath)
                    .replace(diskRootPath, '')
                    .replace('file://', serverBasePath)
                const { method, referrer, headers, uploadData } = request
                // if (uploadData) {
                //     if (uploadData instanceof Array) {
                //         logger.info('rrrrrrrrrrrrrrrrr\n', request.url, '\n', url, '\n', uploadData)
                //         const postData = {
                //             contentType: 'application/json',
                //             data: uploadData[0].bytes,
                //         }
                //         logger.info(
                //             'postData\n',
                //             url,
                //             method,
                //             referrer,
                //             headers,
                //             postData.data.toString(),
                //         )
                //         callback({ url, method: 'POST', referrer, headers, uploadData: postData })
                //     } else {
                //         callback({ url, method: 'POST', referrer, headers, uploadData })
                //     }
                // } else
                callback({ url, method, referrer, headers })
            } catch (error) {
                logger.error('interceptHttpProtocol', error)
            }
        })
    })
    .catch((err) => {
        logger.error('whenReady', err)
    })

app.on('window-all-closed', () => {
    logger.debug('window-all-closed')
    win = null
    // if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    logger.debug('second-instance')
    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    logger.debug('activate')

    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

// New window example arg: new windows url
// ipcMain.handle('open-win', (event, arg) => {
//   const childWindow = new BrowserWindow({
//     webPreferences: {
//       preload,
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   })

//   if (process.env.VITE_DEV_SERVER_URL) {
//     childWindow.loadURL(`${url}#${arg}`)
//   } else {
//     childWindow.loadFile(indexHtml, { hash: arg })
//   }
// })

export default app
