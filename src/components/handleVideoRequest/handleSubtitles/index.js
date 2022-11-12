const logger = require('../../../utils/logger').logger;
const path = require('path');
const fs = require('fs');
const {readdir} = require('../../../utils');
function handleSubtitles(filePath, videoInfo) {
    try {
        logger.debug('handleSubtitles start')
        let videoSub = ['pgs']
        let textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'sub', 'sup', 'subrip']
        let specialCharacter = [':', `'`, '"', '`', '?', '(', ')', '*', '^', '{', '$', '|']
        let videoName = path.parse(filePath).name
        subtitleList = []
        fileRootPath = path.dirname(filePath)
        return readdir(fileRootPath).catch((err) => {
            logger.error('handleSubtitles', err)
        }).then((dir) => {
            let index = 0
            dir.forEach((value) => {
                let suffix = path.extname(value).replace('.', '')
                if ((value.includes(videoName) || videoName.includes(path.parse(value).name)) && [...videoSub, ...textSub].includes(suffix)) {
                    let sub = { path: path.join(fileRootPath, value), source: 'out', codec: suffix }
                    if (textSub.includes(suffix)) {
                        sub.type = 'text'
                    } else sub.type = 'video'
                    try {
                        // let tempSubPath = path.resolve(settings.tempPath,'output',`in.${suffix}`)
                        let tempSubPath = path.resolve('temp', `in${index}.${suffix}`)
                        index++
                        let end = false
                        specialCharacter.forEach(val => {
                            if (end) {
                                return
                            }
                            logger.debug('handleSubtitles', '~~~~~~~~~~~~~~~~~~~~~~', val);
                            if (sub.path.includes(val)) {
                                logger.debug('handleSubtitles', 'copy', sub.path);
                                fs.copyFileSync(sub.path, tempSubPath)
                                sub.path = tempSubPath
                                logger.debug('handleSubtitles', 'to', sub.path);
                                end = true
                            }
                        })
                    } catch (error) {
                        logger.error('handleSubtitles', error);
                    }
                    subtitleList.push(sub)
                }
            })
            if (videoInfo.subtitleStream[0]) {
                videoInfo.subtitleStream.forEach((v, i) => {
                    let sub = { path: filePath, source: 'in', codec: v.codec_name, details: v, subStreamIndex: i }
                    if (textSub.includes(v.codec_name)) {
                        sub.type = 'text'
                    } else sub.type = 'video'
                    subtitleList.push(sub)
                })
            }
            logger.debug('handleSubtitles end');
            return subtitleList
        })
    } catch (error) {
        logger.error('handleSubtitles',error)
    }
}

module.exports = handleSubtitles