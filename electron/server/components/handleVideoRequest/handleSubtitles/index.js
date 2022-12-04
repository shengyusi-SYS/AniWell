const {logger} = require('../../../utils/logger');
const path = require('path');
const fs = require('fs');
const { readdir } = require('fs/promises');

//处理字幕
async function handleSubtitles(filePath, videoInfo) {
    try {
        logger.debug('handleSubtitles start')
        let videoSub = ['pgs']
        let textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'sub', 'sup', 'subrip']
        let specialCharacter = [':', `'`, '"', '`', '?', '(', ')', '*', '^', '{', '$', '|']
        let videoName = path.parse(filePath).name
        subtitleList = []
        fileRootPath = path.dirname(filePath)
        let dir;
        try {
            dir = await readdir(fileRootPath);
            let index = 0;
            dir.forEach((value) => {
                let suffix = path.extname(value).replace('.', '');
                //放宽字幕识别，只要字幕名和视频文件名二者中一项包括另一项，就会被识别为对应字幕
                if ((value.includes(videoName) || videoName.includes(path.parse(value).name)) && [...videoSub, ...textSub].includes(suffix)) {
                    let sub = { path: path.join(fileRootPath, value), source: 'out', codec: suffix };
                    if (textSub.includes(suffix)) {
                        sub.type = 'text';
                    } else
                        sub.type = 'video';
                    try {
                        // let tempSubPath = path.resolve(settings.tempPath,'output',`in.${suffix}`)
                        //特殊字符易造成ffmpeg指令生成困难，因此就复制一份
                        //放到系统临时路径会出现读写问题，就放到应用根目录了
                        let tempSubPath = path.resolve('temp', `in${index}.${suffix}`);
                        index++;
                        let end = false;
                        specialCharacter.forEach(val => {
                            if (end) {
                                return;
                            }
                            logger.debug('handleSubtitles', '~~~~~~~~~~~~~~~~~~~~~~', val);
                            if (sub.path.includes(val)) {
                                logger.debug('handleSubtitles', 'copy', sub.path);
                                fs.copyFileSync(sub.path, tempSubPath);
                                sub.path = tempSubPath;
                                logger.debug('handleSubtitles', 'to', sub.path);
                                end = true;
                            }
                        });
                    } catch (error) {
                        logger.error('handleSubtitles', error);
                    }
                    subtitleList.push(sub);
                }
            });
            //处理内封字幕
            if (videoInfo.subtitleStream[0]) {
                videoInfo.subtitleStream.forEach((v, i) => {
                    let sub_1 = { path: filePath, source: 'in', codec: v.codec_name, details: v, subStreamIndex: i };
                    if (textSub.includes(v.codec_name)) {
                        sub_1.type = 'text';
                    } else
                        sub_1.type = 'video';
                    subtitleList.push(sub_1);
                });
            }
            logger.debug('handleSubtitles end');
            videoInfo.subtitleList = subtitleList;
            return subtitleList;
        } catch (err) {
            logger.error('handleSubtitles', err);
        }
    } catch (error) {
        logger.error('handleSubtitles',error)
    }
}

module.exports = handleSubtitles