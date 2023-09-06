import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import path, { basename } from 'path'
import fs from 'fs'
import { mkdir, readdir } from 'fs/promises'
import { VideoInfo } from '@s/modules/video/task/getVideoInfo'
import { v4 as uuidv4 } from 'uuid'
import subtitles from '@s/store/subtitles'
import paths from '@s/utils/envPath'

export interface subInfo {
    path: string
    source: string
    codec: string
    id: string
    details?: object
    subStreamIndex?: number
    type: string
    url?: string
}
//处理字幕
export default async function handleSubtitles(videoInfo: VideoInfo) {
    try {
        logger.debug('handleSubtitles start')
        subtitles.clear()
        const videoSub = ['pgs']
        const textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'sub', 'sup', 'subrip']
        const specialCharacter = [':', `'`, '"', '`', '?', '(', ')', '*', '^', '{', '$', '|']
        const videoName = path.parse(videoInfo.filePath).name
        const subtitleList = []
        const fileRootPath = path.dirname(videoInfo.filePath)

        //处理外挂字幕
        try {
            const dir = await readdir(fileRootPath)
            for (let index = 0; index < dir.length; index++) {
                const fileName = dir[index]
                const suffix = path.extname(fileName).replace('.', '')
                //放宽字幕识别，只要字幕名和视频文件名二者中一项包括另一项，就会被识别为对应字幕
                if (
                    (fileName.includes(videoName) || videoName.includes(fileName)) &&
                    [...videoSub, ...textSub].includes(suffix)
                ) {
                    const sub: subInfo = {
                        id: uuidv4(),
                        path: path.join(fileRootPath, fileName),
                        source: 'out',
                        codec: suffix,
                        type: '',
                    }
                    if (textSub.includes(suffix)) {
                        sub.type = 'text'
                    } else sub.type = 'video'

                    try {
                        // let tempSubPath = path.resolve(settings.server.tempPath,'output',`in.${suffix}`)
                        //特殊字符易造成ffmpeg指令生成困难，因此就复制一份
                        const tempPath = path.resolve(paths.temp, basename(fileRootPath))
                        try {
                            await mkdir(tempPath)
                        } catch (error) {}

                        const tempSubPath = path.resolve(tempPath, `in${index}.${suffix}`)

                        for (let index = 0; index < specialCharacter.length; index++) {
                            const char = specialCharacter[index]
                            logger.debug(
                                'handleSubtitles specialCharacter',
                                '~~~~~~~~~~~~~~~~~~~~~~',
                                char,
                            )
                            if (sub.path.includes(char)) {
                                logger.debug('handleSubtitles copy', sub.path)
                                fs.copyFileSync(sub.path, tempSubPath)
                                sub.path = tempSubPath
                                logger.debug('handleSubtitles to', sub.path)
                                break
                            }
                        }
                    } catch (error) {
                        logger.error('handleSubtitles', error)
                    }
                    subtitleList.push(sub)
                    subtitles.add(sub)
                }
            }
        } catch (error) {
            logger.error('handleSubtitles out', error)
        }

        //处理内封字幕
        try {
            videoInfo.subtitleStreams?.forEach((v, i) => {
                const sub: subInfo = {
                    id: uuidv4(),
                    path: videoInfo.filePath,
                    source: 'in',
                    codec: v.codec_name,
                    details: v,
                    subStreamIndex: i,
                    type: '',
                }
                if (textSub.includes(v.codec_name)) {
                    sub.type = 'text'
                } else sub.type = 'video'
                subtitleList.push(sub)
                subtitles.add(sub)
            })
        } catch (err) {
            logger.error('handleSubtitles', err)
        }

        videoInfo.subtitleList = subtitleList
        logger.debug('handleSubtitles end', subtitleList)
        return subtitleList
    } catch (error) {
        logger.error('handleSubtitles', error)
    }
}
