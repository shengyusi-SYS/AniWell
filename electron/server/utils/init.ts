import { logger } from '@s/utils/logger'
import fs, { accessSync } from 'fs'
import path from 'path'
import Ffmpeg from 'fluent-ffmpeg'
import os from 'os'
import gpus from './getGPU'
import paths from './envPath'
import settings from '@s/store/settings'
import { librarySettings, librarySettingsTransformer } from '@s/store/librarySettings'
import { users } from '@s/store/users'
import pkg from '../../../package.json'
import { Options } from 'http-proxy-middleware'
import { createCertificate } from '@s/utils/certificate'
// users.store.clear()
// users.modify({
//     admin: {
//         password: 'gerer',
//         alias: 'aaa',
//         salt: 'ffff',
//         access: {
//             admin: false,
//         },
//     },
// })
// users.store.clear()
// console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!', JSON.stringify(users.data(), null, '\t'))
class Init {
    public libraryIndexPath = path.resolve(paths.data, 'libraryIndex.json')
    public librarySettingsPath = path.resolve(paths.data, 'librarySettings.json')

    public Ffmpeg = Ffmpeg

    public proxySettings: Options

    public libraryIndex: {
        label: string
        children: object[]
    } = { label: 'libraryIndex', children: [] }

    public osPlatform: string =
        os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : ''

    public ffmpegSuffix: string =
        os.type() == 'Linux' ? '' : os.type() == 'Windows_NT' ? '.exe' : ''

    public gpus = gpus

    // public signUp = false

    public inited = false

    public appName = pkg.name

    public version = pkg.version

    // public devServer = pkg.debug.env.VITE_DEV_SERVER_URL
    constructor() {
        try {
            fs.mkdirSync(paths.data)
        } catch (error) {}
        // try {
        //    let env =  dotenv.config({ path: '.env.local' }).parsed
        // } catch (error) {
        // }

        this.init()
    }

    /**
     * init
     */
    public init(): this {
        this.inited = true
        try {
            fs.accessSync(settings.get('cert'))
            fs.accessSync(settings.get('key'))
        } catch (error) {
            try {
                const cert = createCertificate()
                fs.writeFileSync(settings.get('key'), cert.key)
                fs.writeFileSync(settings.get('cert'), cert.cert)
                logger.info('init 已创建自签名证书')
            } catch (error) {
                logger.info('init 写入自签名证书失败')
            }
        }
        //建立临时文件夹，用于复制外挂字幕
        try {
            fs.mkdirSync('./temp')
        } catch (error) {}
        try {
            this.check()
        } catch (error) {}
        return this
    }
    public check(): this {
        this.setFFmpeg()
        this.setProxySettings()
        this.readLibraryIndex()
        return this
    }

    private setFFmpeg(): boolean {
        try {
            const ffmpegPath = settings.get('ffmpegPath')
            //根据设置路径检查
            if (ffmpegPath) {
                logger.debug(ffmpegPath)
                fs.accessSync(path.resolve(ffmpegPath, 'ffmpeg' + this.ffmpegSuffix))
                logger.info('init setFFmpeg', '已找到ffmpeg')
            } else {
                //未设置则检查默认位置
                let defaultFFmpegPath: string
                if (this.osPlatform == 'win') {
                    defaultFFmpegPath =
                        import.meta.env.DEV === true
                            ? './thirdParty/win'
                            : path.resolve('./resources/thirdParty/win')
                    fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg.exe'))
                    settings.set('ffmpegPath', defaultFFmpegPath)
                    logger.info('init setFFmpeg win', '已在默认位置找到ffmpeg')
                } else if (this.osPlatform == 'lin') {
                    defaultFFmpegPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
                    fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg'))
                    settings.set('ffmpegPath', defaultFFmpegPath)
                    logger.info('init setFFmpeg lin', '已在默认位置找到ffmpeg')
                }
            }
            //应用检查到的路径
            try {
                const ffmpegPath = settings.get('ffmpegPath')
                this.Ffmpeg.setFfmpegPath(path.resolve(ffmpegPath, `ffmpeg${this.ffmpegSuffix}`))
                this.Ffmpeg.setFfprobePath(path.resolve(ffmpegPath, `ffprobe${this.ffmpegSuffix}`))
                logger.info('init', path.resolve(ffmpegPath, `ffmpeg${this.ffmpegSuffix}`))
            } catch (error) {
                logger.info('init', 'ffmpeg路径错误，请检查2')
                return false
            }
            return true
        } catch (error) {
            settings.set('ffmpegPath', '')
            logger.error('init ffmpeg', '未找到ffmpeg', path.resolve('.'))
            return false
        }
    }

    /**
     * setProxySettings转发配置
     */
    public setProxySettings() {
        this.proxySettings = {
            target: settings.get('qbHost'),
            changeOrigin: false,
            secure: settings.get('secure'),
            ssl: {},
            pathRewrite: { '/old': '' },
        }
        try {
            this.proxySettings.ssl.cert = fs.readFileSync(settings.get('cert'), 'utf8')
            this.proxySettings.ssl.key = fs.readFileSync(settings.get('key'), 'utf8')
        } catch (error) {
            logger.error('error ssl', error)
        }
    }

    /**
     * readLibraryIndex
     */
    public readLibraryIndex() {
        try {
            this.libraryIndex = JSON.parse(fs.readFileSync(this.libraryIndexPath, 'utf8'))
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
