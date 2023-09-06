import { app, shell, BrowserWindow, ipcMain, Tray as EleTray } from 'electron'
import { basename, dirname, join, resolve as pathResolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Tray from './modules/tray'
import NamedPipe from 'named-pipe'
import EasyEvents, { type DuplexEventEmitter } from 'easy-events'
import { Worker } from 'worker_threads'
import { accessSync } from 'fs'
import { spawn } from 'child_process'
import type { serverMethods } from '../../../backend-express/src/index'

const devAll = Boolean(process.env['DEVALL'])
const buildAll = Boolean(process.env['BUILDALL'])
console.log(devAll, buildAll)

let server: EasyEvents<serverMethods>

if (!devAll) {
    let serverPath = pathResolve('../backend-express/out/index.mjs')
    let serverOutPath = dirname(dirname(serverPath))
    let serverRelativePath = './out/index.mjs'
    try {
        accessSync(serverPath)
    } catch (error) {
        serverPath = pathResolve(__dirname, '../backend/index.mjs')
        try {
            accessSync(serverPath)
            serverOutPath = dirname(serverPath)
            serverRelativePath = ''
        } catch (error) {
            serverPath = ''
            console.log('no backend server,please build backend server', serverPath, error)
        }
    }
    if (serverPath) {
        try {
            console.log('running server worker at ' + serverPath)

            server = new EasyEvents(new Worker(serverPath))
            server.channel.on('error', (error) => {
                console.log(error)
            })

            // const serverProcess = spawn("node", [serverRelativePath], { cwd: serverOutPath })
            // class StdioSocket implements DuplexEventEmitter {
            //     input = serverProcess.stdout
            //     output = serverProcess.stdin
            //     postMessage = serverProcess.stdin.write.bind(serverProcess.stdin)
            //     on = serverProcess.stdout.on.bind(serverProcess.stdout)
            //     removeListener = (eventName: string, cb: (...args: any[]) => void) => {
            //         this.input.removeListener(eventName, cb)
            //         this.output.removeListener(eventName, cb)
            //     }
            // }
            // serverProcess.stderr.pipe(process.stdout)
            // serverProcess.stdout.pipe(process.stdout)
            // server = new EasyEvents(new StdioSocket())
        } catch (error) {}
    }
}

let socket: EasyEvents | undefined
if (devAll || buildAll) {
    socket = new EasyEvents(new NamedPipe().connect())
}

let mainWindow: BrowserWindow | undefined

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        title: 'AniWell',
        width: 1280,
        height: 720,
        // show: false,
        // autoHideMenuBar: true,
        titleBarStyle: 'hidden',

        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: pathResolve(__dirname, '../preload/index.js'),
            contextIsolation: true,
        },
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })
    if (devAll || buildAll) {
        socket?.invoke('getFrontendUrl').then(({ url }) => {
            console.log('getFrontendUrl----------', url)
            if (typeof url === 'string') {
                mainWindow?.loadURL(url)
            }
        })
    } else if (server) {
        server
            .invoke('configurateServer')
            .then((config) => {
                return server.invoke('startServer')
            })
            .then(({ host }) => {
                console.log('host----------', host)
                if (typeof host === 'string') {
                    mainWindow?.loadURL(host)
                }
            })
    } else if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        // HMR for renderer base on electron-vite cli.
        // Load the remote URL for development or the local html file for production.
        console.log('no backend or frontend,load launcher renderer')

        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    }
}

let theTray: EleTray | undefined

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true')
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')
    theTray = Tray({ app, createWindow })

    if (import.meta.env.DEV === true) {
        //加载vue.js.devtools
        const vueDevtools = (await import('./modules/vueDevtools')).default
        await vueDevtools()
    }

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    ipcMain.on('openLocalFolder', (event, targetPath) => {
        shell.openPath(pathResolve(targetPath))
    })

    ipcMain.on('closeWindow', (event) => {
        mainWindow?.close()
    })

    ipcMain.on('refreshWindow', (event) => {
        mainWindow?.reload()
    })

    ipcMain.on('test', async (event, data) => {
        console.log(data)
        // const { test } = await import('@s/test')
        // test()
    })
    ipcMain.handle('test1', () => 'test1')
    setTimeout(() => {
        mainWindow?.webContents.send('test2', 'test2')
    }, 2000)
    ipcMain.on('test2', (_event, value) => {
        console.log(value)
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    mainWindow = undefined
    // if (process.platform !== "darwin") {
    //     app.quit()
    // }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
