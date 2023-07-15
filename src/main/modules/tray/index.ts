import { Menu, Tray as EleTray, shell, nativeImage } from "electron"
import { join, resolve } from "path"
import paths from "@s/utils/envPath"
import { v4 as uuidv4 } from "uuid"
import { logger } from "@s/utils/logger"

export default function tray({ app, createWindow }) {
    try {
        logger.info("tray on")
        const tray = new EleTray(icon, uuidv4())
        const contextMenu = Menu.buildFromTemplate([
            {
                label: "主界面",
                type: "normal",
                click: createWindow,
            },
            {
                label: "配置目录",
                type: "normal",
                click() {
                    shell.openPath(paths.config)
                },
            },
            {
                label: "数据目录",
                type: "normal",
                click() {
                    shell.openPath(paths.data)
                },
            },
            {
                label: "应用目录",
                type: "normal",
                click() {
                    shell.openPath(resolve("./"))
                },
            },
            {
                label: "重启",
                type: "normal",
                click() {
                    app.relaunch()
                    app.quit()
                },
            },
            { label: "退出", type: "normal", role: "quit" },
        ])
        tray.setContextMenu(contextMenu)
        tray.setToolTip("FileServer")
        tray.setTitle("FileServer")
        tray.on("double-click", createWindow)
        return tray
    } catch (error) {
        logger.error("tray off", error)
    }
}

export const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAADAFBMVEVMaXFZqNokjs9Lotcljc4jjc9FntYbiMwgis0zlNEXh8wMgMo9mtQ+mtQRhMoDdMMXhswOgcgVhcoIfMYAeMQBc8IAbsH////v9fmz1esoi8wZiMvW5vEAY7zj7vY5ltFsr9rH3u5InNMihcmiy+YAUrR+tt6XwOFfpdYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADjP74aAAAAEXRSTlMAHIgigqqB48WDyuUkJM/6uLxa7GoAAAAJcEhZcwAADsQAAA7EAZUrDhsAAACvSURBVBiVNc9BdsMgDEDBLwkKxslrev8TdtFFXAfiGFAXeZ0bjACYBEf68gsIsGTeng0U4kVBiqitEYSPz5FBnlpsW75fJrdrRMQ9dCdrVZFKMuthartMcsjOmeaBTcpRp6tMcU2FVEYfhivAeDDu+5ePElBTFxl7hkdMzc3OoqF29+usL4QtuKfTYca2qunmxrDTYal99V1/hkC8DQBX4X5iMD0A4N6O9/a/n3fgD7LVVzWGdTfPAAAAAElFTkSuQmCC",
)
