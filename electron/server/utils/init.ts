import { logger } from '@s/utils/logger'
import fs from 'fs'
import path, { join } from 'path'
import os from 'os'
import gpus from './getGPU'
import paths from './envPath'
import settings from '@s/store/settings'
import pkg from '../../../package.json'
import { createCertificate } from '@s/utils/certificate'

class Init {
    public osPlatform: string =
        os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : 'mac'

    public ffmpegSuffix: string =
        os.type() == 'Linux' ? '' : os.type() == 'Windows_NT' ? '.exe' : ''

    public ffmpegPath: string

    public ffprobePath: string

    public ssl = {
        cert: '',
        key: '',
    }

    public gpus = gpus

    public inited = false

    public APPNAME = pkg.name

    public VERSION = pkg.version

    constructor() {
        this.init()
    }

    /**
     * init
     */
    public init(): this {
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
        this.setSSL()
        this.setFFmpeg()
        return this
    }

    private checkFFmpeg(ffmpegDirPath: string) {
        this.ffmpegPath = join(ffmpegDirPath, 'ffmpeg' + this.ffmpegSuffix)
        this.ffprobePath = join(ffmpegDirPath, 'ffprobe' + this.ffmpegSuffix)
        fs.accessSync(this.ffmpegPath)
        fs.accessSync(this.ffprobePath)
    }

    private setFFmpeg(): boolean {
        try {
            const ffmpegDirPath = settings.server.ffmpegPath
            logger.debug('init ffmpegPath', ffmpegDirPath)
            this.checkFFmpeg(ffmpegDirPath)
            logger.info('init setFFmpeg', '已找到ffmpeg')
            return true
        } catch (error) {
            try {
                //尝试检查默认位置
                let defaultFFmpegDirPath: string
                if (this.osPlatform == 'win') {
                    defaultFFmpegDirPath =
                        settings.server.DEV === true
                            ? './thirdParty/win'
                            : path.resolve('./resources/thirdParty/win')
                } else if (this.osPlatform == 'lin') {
                    defaultFFmpegDirPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
                }
                this.checkFFmpeg(defaultFFmpegDirPath)
                settings.server.ffmpegPath = defaultFFmpegDirPath
                logger.info('init setFFmpeg lin', '已在默认位置找到ffmpeg')
                return true
            } catch (error) {
                settings.server.ffmpegPath = ''
                this.ffmpegPath = ''
                this.ffprobePath = ''
                logger.fatal('init ffmpeg', '未找到ffmpeg', path.resolve('.'))
                return false
            }
        }
    }

    /**
     * ssl配置
     */
    private setSSL() {
        try {
            this.ssl.cert = fs.readFileSync(settings.server.cert, 'utf8')
            this.ssl.key = fs.readFileSync(settings.server.key, 'utf8')
        } catch (error) {
            const defaultSSLPath = path.resolve(paths.data, 'ssl')
            try {
                fs.mkdirSync(defaultSSLPath)
            } catch (error) {}
            try {
                const cert = createCertificate()
                this.ssl = cert
                fs.writeFileSync(join(defaultSSLPath, 'domain.pem'), cert.cert)
                fs.writeFileSync(join(defaultSSLPath, 'domain.key'), cert.key)
                logger.info('init 已创建自签名证书')
            } catch (error) {
                logger.fatal('init 写入自签名证书失败', error)
            }
        }
    }
}

export default new Init()
