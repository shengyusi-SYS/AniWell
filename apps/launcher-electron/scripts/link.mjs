import { cpSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "fs"
import { join, resolve } from "path"
const serverOutputPaht = resolve("../backend-express/out")
const serverPath = resolve("./out/backend")
const webOutputPath = resolve("../frontend-vue/out")
const webPath = resolve("./out/frontend")
const serverPkgPath = resolve("../backend-express/package.json")
const electronPkgPath = resolve("./package.json")
const electronPkg = JSON.parse(readFileSync(electronPkgPath).toString())
const serverDeps = JSON.parse(readFileSync(serverPkgPath).toString()).dependencies || {}
const newDeps = Object.assign(electronPkg.dependencies, serverDeps)
electronPkg.dependencies = newDeps
try {
    writeFileSync(electronPkgPath, JSON.stringify(electronPkg, "", "\t"))
    rmSync(serverPath, { recursive: true, force: true })
    rmSync(webPath, { recursive: true, force: true })
    symlinkSync(serverOutputPaht, serverPath)
    symlinkSync(webOutputPath, webPath)
} catch (error) {
    try {
        cpSync(serverOutputPaht, serverPath, { recursive: true, force: true })
        cpSync(webOutputPath, webPath, { recursive: true, force: true })
    } catch (error) {
        console.log(error)
    }
}
