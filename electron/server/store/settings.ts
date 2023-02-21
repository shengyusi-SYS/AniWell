import path, { resolve } from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import { changeLevel } from '@s/utils/logger'

const store = new Store({
    name: 'settings',
    cwd: paths.config,
})
const serverSettingsChecker = {
    serverPort: (v) => typeof v === 'number',
    ffmpegPath: (v) => typeof v === 'string',
    tempPath: (v) => typeof v === 'string',
    cert: (v) => typeof v === 'string',
    key: (v) => typeof v === 'string',
    debug: (v) => typeof v === 'boolean',
}
const transcodeSettingsChecker = {
    platform: (v) => typeof v === 'string',
    bitrate: (v) => typeof v === 'number',
    autoBitrate: (v) => typeof v === 'boolean',
    advAccel: (v) => typeof v === 'boolean',
    encode: (v) => typeof v === 'string',
    customInputCommand: (v) => typeof v === 'string',
    customOutputCommand: (v) => typeof v === 'string',
}
const DEV = Boolean(import.meta.env.DEV)

const settings = new Proxy(
    {
        server: new Proxy(
            {
                serverPort: 9009,
                ffmpegPath: '',
                tempPath: paths.temp,
                cert: resolve(paths.data, 'ssl', 'domain.pem'),
                key: resolve(paths.data, 'ssl', 'domain.key'),
                debug: false,
                DEV: DEV,
                base: DEV ? resolve('.') : '../..',
            },
            {
                get(target, key, reciver) {
                    if (typeof key === 'string') {
                        const val = store.get('server.' + key)
                        if (val == null) {
                            const value = Reflect.get(target, key)
                            store.set('server.' + key, value)
                            return value
                        } else {
                            Reflect.set(target, key, val)
                            return val
                        }
                    } else return Reflect.get(target, key)
                },
                set(target, key, value, reciver) {
                    if (typeof key === 'string' && serverSettingsChecker[key](value)) {
                        store.set('server.' + key, value)
                        Reflect.set(target, key, value)
                        switch (key) {
                            case 'debug':
                                value ? changeLevel(true) : null
                                break
                        }
                        return true
                    } else return false
                },
            },
        ),
        transcode: new Proxy(
            {
                platform: 'nvidia',
                bitrate: 5,
                autoBitrate: false,
                advAccel: true,
                encode: 'h264',
                customInputCommand: '',
                customOutputCommand: '',
            },
            {
                get(target, key, reciver) {
                    if (typeof key === 'string') {
                        const val = store.get('transcode.' + key)
                        if (val == null) {
                            const value = Reflect.get(target, key)
                            store.set('transcode.' + key, value)
                            return value
                        } else {
                            Reflect.set(target, key, val)
                            return val
                        }
                    } else return Reflect.get(target, key)
                },
                set(target, key, value, reciver) {
                    if (typeof key === 'string' && transcodeSettingsChecker[key](value)) {
                        store.set('transcode.' + key, value)
                        Reflect.set(target, key, value)
                        return true
                    } else return false
                },
            },
        ),
    },
    {
        get(target, key) {
            return Reflect.get(target, key)
        },
        set(target, key, value) {
            Reflect.set(target, key, value)
            return true
        },
    },
)
changeLevel(settings.server.debug)
export default settings
