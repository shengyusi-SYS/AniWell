import { logger } from "@s/utils/logger"
import path from "path"
import fs from "fs"
import { readdir } from "fs/promises"

//处理字幕
async function handleSubtitles(filePath, videoInfo) {
    try {
        logger.debug("handleSubtitles start")
        const videoSub = ["pgs"]
        const textSub = ["ass", "ssa", "srt", "vtt", "mks", "sub", "sup", "subrip"]
        const specialCharacter = [":", `'`, '"', "`", "?", "(", ")", "*", "^", "{", "$", "|"]
        const videoName = path.parse(filePath).name
        const subtitleList = []
        const fileRootPath = path.dirname(filePath)
        let dir
        try {
            dir = await readdir(fileRootPath)
            let index = 0
            dir.forEach((value) => {
                const suffix = path.extname(value).replace(".", "")
                //放宽字幕识别，只要字幕名和视频文件名二者中一项包括另一项，就会被识别为对应字幕
                if (
                    (value.includes(videoName) || videoName.includes(path.parse(value).name)) &&
                    [...videoSub, ...textSub].includes(suffix)
                ) {
                    const sub = {
                        path: path.join(fileRootPath, value),
                        source: "out",
                        codec: suffix,
                    }
                    if (textSub.includes(suffix)) {
                        sub.type = "text"
                    } else sub.type = "video"
                    try {
                        // let tempSubPath = path.resolve(settings.get('tempPath'),'output',`in.${suffix}`)
                        //特殊字符易造成ffmpeg指令生成困难，因此就复制一份
                        //放到系统临时路径会出现读写问题，就放到应用根目录了
                        const tempSubPath = path.resolve("temp", `in${index}.${suffix}`)
                        index++
                        let end = false
                        specialCharacter.forEach((val) => {
                            if (end) {
                                return
                            }
                            logger.debug("handleSubtitles", "~~~~~~~~~~~~~~~~~~~~~~", val)
                            if (sub.path.includes(val)) {
                                logger.debug("handleSubtitles", "copy", sub.path)
                                fs.copyFileSync(sub.path, tempSubPath)
                                sub.path = tempSubPath
                                logger.debug("handleSubtitles", "to", sub.path)
                                end = true
                            }
                        })
                    } catch (error) {
                        logger.error("handleSubtitles", error)
                    }
                    subtitleList.push(sub)
                }
            })
            //处理内封字幕
            if (videoInfo.subtitleStream[0]) {
                videoInfo.subtitleStream.forEach((v, i) => {
                    const sub = {
                        path: filePath,
                        source: "in",
                        codec: v.codec_name,
                        details: v,
                        subStreamIndex: i,
                    }
                    if (textSub.includes(v.codec_name)) {
                        sub.type = "text"
                    } else sub.type = "video"
                    subtitleList.push(sub)
                })
            }
            logger.debug("handleSubtitles end")
            videoInfo.subtitleList = subtitleList
            return subtitleList
        } catch (err) {
            logger.error("handleSubtitles", err)
        }
    } catch (error) {
        logger.error("handleSubtitles", error)
    }
}

export default handleSubtitles
