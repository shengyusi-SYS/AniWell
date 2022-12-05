import { logger } from '@s/utils/logger'
import fs from 'fs'
import path from 'path'
import Ffmpeg from 'fluent-ffmpeg'
import os from 'os'
// import gpus from './getGPU';

interface settings {
    qbHost: string
    serverPort: string
    tempPath: string
    ffmpegPath: string
    cert: string
    key: string
    secure: boolean
    share: boolean
    bitrate: string
    autoBitrate: boolean
    advAccel: boolean
    platform: string
    encode: string
    tmdbKey: string
    customInputCommand: string
    customOutputCommand: string
    debug: boolean
}

class Init {
    public settingsList = {
        qbHost: {
            type: 'text',
            name: 'qbHost',
            value: 'http://localhost:8080',
            placeholder: 'http://localhost:8080',
        },
        serverPort: { type: 'number', name: 'serverPort', value: 9009, placeholder: '9009' },
        tempPath: { type: 'text', name: 'tempPath', value: os.tmpdir(), placeholder: os.tmpdir() },
        ffmpegPath: {
            type: 'text',
            name: 'ffmpegPath',
            value: '',
            placeholder: path.resolve(__dirname, `../thirdParty/win`),
        },
        // dandanplayPath: { type: 'text', name: 'dandanplayPath', value: '', placeholder: '' },
        cert: {
            type: 'text',
            name: 'cert',
            value: './ssl/domain.pem',
            placeholder: './ssl/domain.pem',
        },
        key: {
            type: 'text',
            name: 'key',
            value: './ssl/domain.key',
            placeholder: './ssl/domain.key',
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

    public settings: settings = {
        qbHost: '',
        serverPort: '',
        tempPath: '',
        ffmpegPath: '',
        cert: '',
        key: '',
        secure: false,
        share: false,
        bitrate: '',
        autoBitrate: false,
        advAccel: true,
        platform: '',
        encode: '',
        tmdbKey: '',
        customInputCommand: '',
        customOutputCommand: '',
        debug: false,
    }

    public Ffmpeg = Ffmpeg

    public proxySettings: {
        target: string
        changeOrigin: boolean
        secure: boolean
        ssl: {
            cert?: string
            key?: string
        }
    }

    public libraryIndex: {
        label: string
        children: object[]
    } = { label: 'libraryIndex', children: [] }

    public osPlatform: string =
        os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : ''

    public ffmpegSuffix: string =
        os.type() == 'Linux' ? '' : os.type() == 'Windows_NT' ? '.exe' : ''

    constructor() {
        for (const key in this.settingsList) {
            this.settings[this.settingsList[key].name] = this.settingsList[key].value
        }
        this.init()
    }

    /**
     * init
     */
    public init() {
        try {
            //尝试读取settings.json
            const exist: string = fs.readFileSync('./settings.json').toString()
            let newSettings: object
            try {
                //检查设置文件
                newSettings = JSON.parse(exist)
                if (!newSettings) {
                    throw new Error('')
                }
                //覆盖默认设置
                this.mergeSettings(newSettings)
                fs.writeFileSync('./settings.json', JSON.stringify(this.settings, null, '\t'))
                //备份成功设置
                fs.writeFileSync(
                    path.resolve(this.settings.tempPath, './settings_backup.json'),
                    JSON.stringify(this.settings, null, '\t'),
                )
                logger.info('init', '已加载本地配置', this.settings)
            } catch (error) {
                //设置文件错误则读取备份的成功设置
                newSettings = JSON.parse(
                    fs.readFileSync(
                        path.resolve(this.settings.tempPath, './settings_backup.json'),
                        'utf8',
                    ),
                )
                this.mergeSettings(newSettings)
                logger.info('init', '配置项错误，请检查1')
            }
        } catch (error) {
            //初始化settings.json
            try {
                //建立临时文件夹，用于复制外挂字幕
                try {
                    fs.mkdirSync('./temp')
                } catch (error) {}
                fs.writeFileSync('./settings.json', JSON.stringify(this.settings, null, '\t'))
                logger.debug('init', '已写入默认配置')
            } catch (error) {}
        }
        //检查ffmpeg路径
        this.setFFmpeg()
        this.setProxySettings()
        this.readLibraryIndex()
    }

    public mergeSettings(newSettings: object): void {
        const settings: settings = Object.assign(this.settings, newSettings)
        for (const key in settings) {
            this.settingsList[key].value = settings[key]
        }
    }

    private setFFmpeg(): boolean {
        try {
            //根据设置路径检查
            if (this.settings.ffmpegPath) {
                fs.accessSync(path.resolve(this.settings.ffmpegPath, 'ffmpeg' + this.ffmpegSuffix))
                logger.info('init setFFmpeg', '已找到ffmpeg')
            } else {
                //未设置则检查默认位置
                let defaultFFmpegPath: string
                if (this.osPlatform == 'win') {
                    defaultFFmpegPath = path.resolve(__dirname, '../thirdParty/win')
                    fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg.exe'))
                    this.settings.ffmpegPath = defaultFFmpegPath
                    logger.info('init setFFmpeg win', '已在默认位置找到ffmpeg')
                } else if (this.osPlatform == 'lin') {
                    defaultFFmpegPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
                    fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg'))
                    this.settings.ffmpegPath = defaultFFmpegPath
                    logger.info('init setFFmpeg lin', '已在默认位置找到ffmpeg')
                }
            }
            //应用检查到的路径
            try {
                this.Ffmpeg.setFfmpegPath(
                    path.resolve(this.settings.ffmpegPath, `ffmpeg${this.ffmpegSuffix}`),
                )
                this.Ffmpeg.setFfprobePath(
                    path.resolve(this.settings.ffmpegPath, `ffprobe${this.ffmpegSuffix}`),
                )
                logger.info(
                    'init',
                    path.resolve(this.settings.ffmpegPath, `ffmpeg${this.ffmpegSuffix}`),
                )
            } catch (error) {
                logger.info('init', 'ffmpeg路径错误，请检查2')
                return false
            }
            return true
        } catch (error) {
            this.settings.ffmpegPath = ''
            logger.error('init ffmpeg', '未找到ffmpeg')
            return false
        }
    }

    /**
     * setProxySettings转发配置
     */
    public setProxySettings() {
        this.proxySettings = {
            target: this.settings.qbHost,
            changeOrigin: false,
            secure: this.settings.secure,
            ssl: {},
        }
        try {
            this.proxySettings.ssl.cert = fs.readFileSync(this.settings.cert, 'utf8')
            this.proxySettings.ssl.key = fs.readFileSync(this.settings.key, 'utf8')
        } catch (error) {
            logger.error('error ssl', error)
        }
    }

    /**
     * readLibraryIndex
     */
    public readLibraryIndex() {
        try {
            this.libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json', 'utf8'))
            logger.info('debug', '已加载媒体库')
        } catch (error) {
            logger.info('debug', '媒体库不存在')
        }
        if (!this.libraryIndex || !this.libraryIndex.children || !this.libraryIndex.label) {
            this.libraryIndex = { label: 'libraryIndex', children: [] }
        }
        return this.libraryIndex
    }
    public say() {
        console.log(this)
    }
}

// var settings = {}

// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']

export default new Init()
