import path, { resolve } from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import throttle from 'lodash/throttle'
import { changeLevel } from '@s/utils/logger'
const dev = Boolean(import.meta.env.DEV)

const store = new Store({
    name: 'settings',
    cwd: paths.config,
    defaults: {
        server: {
            serverPort: 9009,
            ffmpegPath: '',
            tempPath: paths.temp,
            cert: resolve(paths.data, 'ssl', 'domain.pem'),
            key: resolve(paths.data, 'ssl', 'domain.key'),
            debug: false,
            dev: dev,
            base: dev ? resolve('.') : '../..',
        },
        transcode: {
            platform: 'nvidia',
            bitrate: 5,
            autoBitrate: false,
            advAccel: true,
            encode: 'h264',
            customInputCommand: '',
            customOutputCommand: '',
        },
    },
})

const settingsChecker = {
    serverPort: (v) => typeof v === 'number',
    ffmpegPath: (v) => typeof v === 'string',
    tempPath: (v) => typeof v === 'string',
    cert: (v) => typeof v === 'string',
    key: (v) => typeof v === 'string',
    debug: (v) => typeof v === 'boolean',
    platform: (v) => typeof v === 'string',
    bitrate: (v) => typeof v === 'number',
    autoBitrate: (v) => typeof v === 'boolean',
    advAccel: (v) => typeof v === 'boolean',
    encode: (v) => typeof v === 'string',
    customInputCommand: (v) => typeof v === 'string',
    customOutputCommand: (v) => typeof v === 'string',
}

const save = throttle(() => {
    store.clear()
    store.set(settings)
    console.log('saved')
}, 3000)

const settings = new Proxy(store.store, {
    get(target, key) {
        if (key === 'server' || key === 'transcode') {
            return new Proxy(Reflect.get(target, key), {
                get(target, key, reciver) {
                    if (key === 'dev') {
                        return dev
                    }
                    return Reflect.get(target, key)
                },
                set(target, key, value, reciver) {
                    let res
                    if (settingsChecker[key] == undefined) {
                        res = Reflect.set(target, key, value)
                    } else if (typeof key === 'string' && settingsChecker[key](value)) {
                        if (key === 'dev') {
                            res = Reflect.set(target, key, dev)
                        } else {
                            res = Reflect.set(target, key, value)
                        }
                        if (res && key === 'debug') {
                            changeLevel(value)
                        }
                    } else res = false
                    if (res === true) save()
                    return res
                },
            })
        } else return Reflect.get(target, key)
    },
    set(target, key, value) {
        const res = Reflect.set(target, key, value)
        if (res === true) save()
        return res
    },
})

changeLevel(settings.server.debug)

export default settings
