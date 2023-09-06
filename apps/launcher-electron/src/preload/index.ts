import { contextBridge } from "electron"
import { electronAPI } from "@electron-toolkit/preload"
import { ipcRenderer } from "electron"

// Custom APIs for renderer
const api = {
    signUp: () => ipcRenderer.invoke("signUp"),
    test: (data) => ipcRenderer.send("test", data),
    test1: () => ipcRenderer.invoke("test1"),
    test2: (callback) => ipcRenderer.on("test2", callback),
    openLocalFolder: (targetPath) => ipcRenderer.send("openLocalFolder", targetPath),
    closeWindow: () => ipcRenderer.send("closeWindow"),
    refreshWindow: () => ipcRenderer.send("refreshWindow"),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        // contextBridge.exposeInMainWorld("electron", electronAPI)
        // contextBridge.exposeInMainWorld("api", api)
        contextBridge.exposeInMainWorld("electronAPI", api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    // window.electron = electronAPI
    // @ts-ignore (define in dts)
    // window.api = api
    window.electronAPI = api
}
