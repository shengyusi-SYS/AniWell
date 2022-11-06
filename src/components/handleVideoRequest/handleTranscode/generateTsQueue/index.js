const {logger} = require('../../../../utils/logger');
const generateFFmpegCommand = require('../generateFFmpegCommand');
const {hlsTemp} = require('../../old');
const {videoIndex} = require('../generateM3U8');
var {FFmpegProcess} = require('../../old');
function generateTsQueue(videoInfo, subtitleList) {
    let filePath = hlsTemp
    let lastWriteId = -1
    for (const segment in videoIndex) {
        let { inputParams, outputParams } = generateFfmpegCommand(videoInfo, subtitleList, segment)
        let params = [
            ...inputParams,
            `-i "${filePath}"`,
            ...outputParams,
            path.resolve(settings.tempPath, 'output', 'tempList', `${segment}.m3u8`)
        ]
        // if (segment == 'index0') {
        // }
        let process = async () => {
            await killCurrentProcess(segment)
            transState = 'doing'
            if ((Number(segment.replace('index', '')) == Object.keys(videoIndex).length - 1) && FFmpegProcess[segment].state == 'done') {
                return
            }
            logger.debug('debug', path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`));
            let ffmpeg = spawn(settings.ffmpegPath ? `"${path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`)}"` : 'ffmpeg', params, {
                shell: true,
                //    stdio: 'inherit'
            })
            processList.push(ffmpeg)
            ffmpeg.queue = []
            ffmpeg.id = Number(segment.replace('index', ''))
            logger.debug('debug', 'start------------------------' + segment);
            logger.debug('debug', [params.join(' ')]);
            // function checkSegment(segment) {
            //     let checkTimes = 0
            //     function check(segment) {
            //         return new Promise((r, j) => {
            //             stat(path.resolve(settings.tempPath, 'output', `${segment}.ts`)).then((result) => {
            //                 FFmpegProcess[segment].state = 'done'
            //                 ffmpeg.queue.push(segment)
            //                 logger.debug('debug',segment, 'done');
            //                 checkTimes = 0
            //                 r(true)
            //             }).catch((err) => {
            //                 if (checkTimes < 10) {
            //                     setTimeout(() => {
            //                         logger.debug('debug','cccccccccccccckkkkkkkkk');
            //                         checkTimes++
            //                         check(segment)
            //                     }, 500)
            //                 } else {
            //                     j(false)
            //                 }
            //             })

            //         }).catch(err=>logger.debug('debug',err))
            //     }
            //     return check()
            // }
            ffmpeg.stderr.on('data', async function (stderrLine) {
                currentProcess = ffmpeg
                stderrLine = stderrLine.toString()
                transcodeLogger.debug('debug', `~${stderrLine}`);
                // logger.debug('debug',`${stderrLine} ${Boolean(stderrLine.match(/Opening.*for writing/))} ${stderrLine.search(/m3u8/) == -1}`);
                if (/Opening.*for writing/.test(stderrLine) && !/m3u8/i.test(stderrLine)) {
                    let writingSegment = path.parse(path.parse(/'.*'/.exec(stderrLine)[0]).name).name
                    writingSegmentId = Number(writingSegment.replace('index', ''))
                    let nextSegment = `index${writingSegmentId + 1}`

                    // logger.debug('debug',`${stderrLine}`);

                    // await checkSegment(writingSegment)

                    if (lastWriteId != writingSegmentId - 1 && lastWriteId >= ffmpeg.id) {
                        for (; lastWriteId <= writingSegmentId - 1; lastWriteId++) {
                            let tempLostSegment = `index${lastWriteId}`
                            logger.debug('debug', 'lossssssssssssssssssssst', lastWriteId);
                            stat(path.resolve(settings.tempPath, 'output', `${tempLostSegment}.ts`)).then((result) => {
                                FFmpegProcess[tempLostSegment].state = 'done'
                                logger.debug('debug', 'reloaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad', result, tempLostSegment, FFmpegProcess[tempLostSegment]);
                            }).catch((err) => {
                                logger.error('error', 'errrrrrrrrrrrrr', FFmpegProcess[tempLostSegment], err);
                            });
                        }
                        // await checkSegment(`index${lastWriteId}`)
                    }
                    lastWriteId = writingSegmentId

                    // logger.debug('debug',writingSegmentId);
                    if (writingSegmentId != ffmpeg.id) {
                        let completedSegment = `index${writingSegmentId - 1 >= 0 ? writingSegmentId - 1 : 0}`
                        ffmpeg.queue.push(completedSegment)
                        FFmpegProcess[completedSegment].state = 'done'
                        logger.debug('debug', completedSegment, 'done');
                    }

                    if (writingSegmentId == Object.keys(videoIndex).length - 1) {
                        logger.debug('debug', 'end~~~~~~~~~~~~~~~~~~', writingSegmentId);
                        FFmpegProcess[writingSegment].state = 'done'
                        return
                    }
                    if (FFmpegProcess[writingSegment].state == 'done' && transState != 'changing') {
                        await killCurrentProcess()
                        logger.debug('debug', 'breeeeeeeeeeeeeeeeeeak', writingSegment);
                        let nextProcessId = writingSegmentId + 1
                        if (FFmpegProcess[`index${nextProcessId}`]) {
                            while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                                if (nextProcessId >= Object.keys(videoIndex).length - 1) {
                                    logger.debug('debug', 'end-------------------', nextProcessId);
                                    break
                                } else { nextProcessId++ }
                            }
                            logger.debug('debug', 'coooooooooooooooooooon', nextProcessId);
                            FFmpegProcess[`index${nextProcessId}`].process()
                        } else {
                            logger.debug('debug', 'end-------------------', nextProcessId);
                        }
                    }
                }
            })
            return ffmpeg
        }

        FFmpegProcess[segment] = {
            process,
            state: 'init'
        }
        // logger.debug('debug','generate'+process);
    }
    return FFmpegProcess
}

module.exports = generateTsQueue