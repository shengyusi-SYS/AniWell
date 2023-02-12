import { logger } from '@s/utils/logger'
import path from 'path'
import fs from 'fs'
import { readdir } from 'fs/promises'
import { VideoInfo } from '@s/modules/video/task/getVideoInfo'
import { v4 as uuidv4 } from 'uuid'
import subtitles from '@s/store/subtitles'

export interface subInfo {
    path: string
    source: string
    codec: string
    id: string
    details?: object
    subStreamIndex?: number
    type?: string
    url?: string
}
//处理字幕
export default async function handleSubtitles(videoInfo: VideoInfo) {
    try {
        logger.debug('handleSubtitles start')
        const videoSub = ['pgs']
        const textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'sub', 'sup', 'subrip']
        const specialCharacter = [':', `'`, '"', '`', '?', '(', ')', '*', '^', '{', '$', '|']
        const videoName = path.parse(videoInfo.filePath).name
        const subtitleList = []
        const fileRootPath = path.dirname(videoInfo.filePath)
        let dir
        try {
            dir = await readdir(fileRootPath)
            let index = 0
            dir.forEach((value) => {
                const suffix = path.extname(value).replace('.', '')
                //放宽字幕识别，只要字幕名和视频文件名二者中一项包括另一项，就会被识别为对应字幕
                if (
                    (value.includes(videoName) || videoName.includes(path.parse(value).name)) &&
                    [...videoSub, ...textSub].includes(suffix)
                ) {
                    const sub: subInfo = {
                        id: uuidv4(),
                        path: path.join(fileRootPath, value),
                        source: 'out',
                        codec: suffix,
                    }
                    if (textSub.includes(suffix)) {
                        sub.type = 'text'
                    } else sub.type = 'video'
                    try {
                        // let tempSubPath = path.resolve(settings.get('tempPath'),'output',`in.${suffix}`)
                        //特殊字符易造成ffmpeg指令生成困难，因此就复制一份
                        //放到系统临时路径会出现读写问题，就放到应用根目录了
                        const tempSubPath = path.resolve('temp', `in${index}.${suffix}`)
                        index++
                        let end = false
                        specialCharacter.forEach((val) => {
                            if (end) {
                                return
                            }
                            logger.debug('handleSubtitles', '~~~~~~~~~~~~~~~~~~~~~~', val)
                            if (sub.path.includes(val)) {
                                logger.debug('handleSubtitles', 'copy', sub.path)
                                fs.copyFileSync(sub.path, tempSubPath)
                                sub.path = tempSubPath
                                logger.debug('handleSubtitles', 'to', sub.path)
                                end = true
                            }
                        })
                    } catch (error) {
                        logger.error('handleSubtitles', error)
                    }
                    subtitleList.push(sub)
                    subtitles.add(sub)
                }
            })
            //处理内封字幕
            if (videoInfo.subtitleStreams[0]) {
                videoInfo.subtitleStreams.forEach((v, i) => {
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
            }
            logger.debug('handleSubtitles end')
            videoInfo.subtitleList = subtitleList
            return subtitleList
        } catch (err) {
            logger.error('handleSubtitles', err)
        }
    } catch (error) {
        logger.error('handleSubtitles', error)
    }
}
