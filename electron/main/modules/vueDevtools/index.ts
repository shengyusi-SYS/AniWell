import { session } from 'electron'
import { readdir } from 'fs/promises'
import { homedir } from 'os'
import { resolve } from 'path'

export default async function devtools() {
    if (import.meta.env.DEV === true && !/https/.test(process.env.VITE_DEV_SERVER_URL)) {
        try {
            const devtoolsPath = resolve(
                homedir(),
                process.env.LOCALAPPDATA,
                'Google/Chrome/User Data/Default/Extensions/nhdogjmejiglipccpnnnanhbledajbpd',
            )
            const version = (await readdir(devtoolsPath)).sort((a, b) => (a > b ? -1 : 1))[0]
            await session.defaultSession.loadExtension(resolve(devtoolsPath, version))
            console.log('vue-devtools on')
        } catch (error) {}
    }
}
