import { Menu, Tray as EleTray, shell } from 'electron'
import { join, resolve } from 'path'
import paths from '@s/utils/envPath'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@s/utils/logger'

export default function tray({ app, createWindow }) {
    try {
        console.log('tray on')
        const iconPath: string = import.meta.env.DEV
            ? join(__dirname, '../../public/favicon.ico')
            : join(__dirname, '../../../public/favicon.ico')
        logger.info('tray', iconPath)
        const tray = new EleTray(iconPath, uuidv4())
        const contextMenu = Menu.buildFromTemplate([
            {
                label: '主界面',
                type: 'normal',
                click: createWindow,
            },
            {
                label: '数据目录',
                type: 'normal',
                click() {
                    shell.openPath(paths.data)
                },
            },
            {
                label: '应用目录',
                type: 'normal',
                click() {
                    shell.openPath(resolve('./'))
                },
            },
            {
                label: '重启',
                type: 'normal',
                click() {
                    app.relaunch()
                    app.quit()
                },
            },
            { label: '退出', type: 'normal', role: 'quit' },
        ])
        tray.setContextMenu(contextMenu)
        tray.setToolTip('FileServer')
        tray.setTitle('FileServer')
        tray.on('double-click', createWindow)
        return tray
    } catch (error) {
        console.log('tray off', error)
    }
}
