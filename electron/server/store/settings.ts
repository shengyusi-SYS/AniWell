import path from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import { TransformConfig, Simple, Complex } from '@s/utils/transformConfig'
import gpus from '@s/utils/getGPU'

interface SettingsData extends Simple {
    qbHost: string
    serverPort: string
    tempPath: string
    ffmpegPath: string
    cert: string
    key: string
    secure: boolean
    share: boolean
    bitrate: number
    autoBitrate: boolean
    advAccel: boolean
    platform: string
    encode: string
    tmdbKey: string
    customInputCommand: string
    customOutputCommand: string
    debug: boolean
}
const settingsList: Complex = {
    qbHost: {
        type: 'text',
        name: 'qbHost',
        value: 'http://localhost:8080',
        placeholder: 'http://localhost:8080',
    },
    serverPort: { type: 'number', name: 'serverPort', value: 9009, placeholder: '9009' },
    tempPath: { type: 'text', name: 'tempPath', value: paths.temp, placeholder: paths.temp },
    ffmpegPath: {
        type: 'text',
        name: 'ffmpegPath',
        value: '',
        placeholder: path.resolve('./resources/thirdParty/win'),
    },
    // dandanplayPath: { type: 'text', name: 'dandanplayPath', value: '', placeholder: '' },
    cert: {
        type: 'text',
        name: 'cert',
        value: path.resolve(paths.data, './ssl/domain.pem'),
        placeholder: path.resolve(paths.data, './ssl/domain.pem'),
    },
    key: {
        type: 'text',
        name: 'key',
        value: path.resolve(paths.data, './ssl/domain.key'),
        placeholder: path.resolve(paths.data, './ssl/domain.key'),
    },
    // burnSubtitle: { type: 'switch',name:'burnSubtitle',value:'' },
    secure: { type: 'switch', name: 'secure', value: false },
    share: { type: 'switch', name: 'share', value: false },
    bitrate: { type: 'number', name: 'bitrate', value: '5', placeholder: '5' },
    autoBitrate: { type: 'switch', name: 'autoBitrate', value: false },
    advAccel: { type: 'switch', name: 'advAccel', value: true },
    platform: {
        type: 'radios',
        name: 'platform',
        value: 'nvidia',
        placeholder: '',
        radios: {
            nvidia: { name: 'nvidia', value: 'nvidia' },
            intel: { name: 'intel', value: 'intel' },
            amd: { name: 'amd', value: 'amd' },
            vaapi: { name: 'vaapi', value: 'vaapi' },
        },
    },
    encode: {
        type: 'radios',
        name: 'encode',
        value: 'h264',
        placeholder: '',
        radios: {
            h264: { name: 'h264', value: 'h264' },
            h265: { name: 'h265', value: 'h265' },
        },
    },
    tmdbKey: { type: 'text', name: 'tmdbKey', value: '', placeholder: 'TMDB API KEY' },
    customInputCommand: {
        type: 'textarea',
        name: 'customInputCommand',
        value: '',
        placeholder: '指令设定请参考readme文档，勿轻易修改',
    },
    customOutputCommand: {
        type: 'textarea',
        name: 'customOutputCommand',
        value: '',
        placeholder: '指令设定请参考readme文档，勿轻易修改',
    },
    debug: { type: 'switch', name: 'debug', value: false },
}
import init from '@s/utils/init'
class Settings {
    public store: Store<SettingsData>
    public transformer: TransformConfig
    readonly data: SettingsData
    constructor() {
        this.transformer = new TransformConfig(settingsList)
        const defaults = JSON.parse(
            JSON.stringify(this.transformer.simple),
        ) as unknown as SettingsData
        this.store = new Store({
            name: 'settings',
            cwd: paths.config,
            defaults,
        })
        this.data = this.store.store
    }
    /**
     * get
     */
    public get(target: string): any {
        return this.store.get(target)
    }
    /**
     * set
     */
    public set(key: string, value: unknown): void {
        return this.store.set(key, value)
    }
    /**
     * update
     */
    public update(newSettings: Simple) {
        for (const key in newSettings) {
            if (Object.prototype.hasOwnProperty.call(newSettings, key)) {
                this.store.set(key, newSettings[key])
            }
        }
        init.check()
    }
    /**
     * list
     */
    public list() {
        this.transformer.s2c(this.store.store)
        return this.transformer.complex
    }
}
const settings = new Settings()
export default settings
