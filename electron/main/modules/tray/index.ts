import { Menu, Tray as EleTray, shell } from 'electron'
import { resolve } from 'path'
import paths from '@s/utils/envPath'

export default function tray({ app, createWindow }) {
    try {
        console.log('tray on')

        const iconPath: string = resolve(process.env.PUBLIC, 'favicon.ico')
        const tray = new EleTray(
            iconPath,
            import.meta.env.DEV === true ? 'ec74c48e-4e12-4764-a8a6-bbe7e1f4d92b' : null,
        )
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
