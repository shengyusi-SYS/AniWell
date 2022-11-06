const logger = require('../../../utils/logger').logger;
const path = require('path');
const fs = require('fs');
const {readdir} = require('../../../utils');
function handleSubtitles(filePath, videoInfo) {
    let videoSub = ['pgs']
    let textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'sub', 'sup', 'subrip']
    let specialCharacter = [':', `'`, '"', '`', '.', '?', '(', ')', '*', '^', '{', '$', '|']
    let videoName = path.parse(filePath).name
    subtitleList = []
    fileRootPath = path.dirname(filePath)
    return readdir(fileRootPath).catch((err) => {
        logger.error('error', err)
    }).then((dir) => {
        dir.forEach(v => {
            let suffix = path.extname(v).replace('.', '')
            if ((v.includes(videoName) || videoName.includes(path.parse(v).name)) && [...videoSub, ...textSub].includes(suffix)) {
                let sub = { path: path.join(fileRootPath, v), source: 'out', codec: suffix }
                if (textSub.includes(suffix)) {
                    sub.type = 'text'
                } else sub.type = 'video'
                try {
                    // let tempSubPath = path.resolve(settings.tempPath,'output',`in.${suffix}`)
                    let tempSubPath = path.resolve('temp', `in.${suffix}`)
                    let end = false
                    specialCharacter.forEach(v => {
                        if (end) {
                            return
                        }
                        logger.debug('debug', '~~~~~~~~~~~~~~~~~~~~~~', v);
                        if (sub.path.includes(v)) {
                            logger.debug('debug', 'copy', sub.path);
                            fs.copyFileSync(sub.path, tempSubPath)
                            sub.path = tempSubPath
                            logger.debug('debug', 'to', sub.path);
                            end = true
                        }
                    })
                } catch (error) {
                    logger.error('error', error);
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
        logger.debug('debug', subtitleList[0]);
        return subtitleList
    })
}

module.exports = handleSubtitles