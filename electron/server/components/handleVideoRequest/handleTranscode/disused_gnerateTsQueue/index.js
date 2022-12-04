const {logger,transcodeLogger} = require('../../../../utils/logger');
const {settings,ffmpegSuffix} = require('../../../../utils/init');
const {event,stat} = require('../../../../utils');
const path = require('path');
const { spawn } = require('child_process');
const kill = require('tree-kill');

//旧版ffmpeg进程系统，已废弃
var FFmpegProcess = {}
var lastProcessList = []
var killTimeout = {}
var processList = []
var currentProcess
function killCurrentProcess(start) {
    try {
           transState = 'changing'
    logger.debug('debug', 'dddddddddddddddd');
    if (lastProcessList) {
        lastProcessList.forEach(v => {
            kill(v.pid, 'SIGKILL')
        })
    }
    return new Promise((r, j) => {
        let tempProcessList = JSON.parse(JSON.stringify(processList))
        if (currentProcess) {
            currentProcess.on('close', () => {
                logger.debug('debug', 'ccccccccccccccc');
                return r()
            })
            currentProcess.on('exit', () => {
                logger.debug('debug', 'eeeeeeeeeeeeeeeee');
                return r()
            })
            currentProcess.on('error', (err) => {
                logger.debug('debug', 'rrrrrrrrrrrrrrrrrr');
                return j(err)
            })
            kill(currentProcess.pid, 'SIGKILL')
        } else {
            return r()
        }
        killTimeout = setTimeout(() => {
            tempProcessList.forEach(v => {
                kill(v.pid, 'SIGKILL')
            })
            logger.debug('debug', 'kkkkkkk~~~~~~~~~', currentProcess.id);
            return r()
        }, 3000);
    }).then((result) => {
        clearTimeout(killTimeout)
        transState = 'stop'
        return result
    }).catch((err) => {
        clearTimeout(killTimeout)
        logger.error('error', err);
        return
    }) 
    } catch (error) {
        logger.error('generateTsQueue killCurrentProcess',error)
        
    }

}
function generateTsQueue(videoInfo,commandTemplate) {
    try {
          FFmpegProcess = {}
    let lastWriteId = -1
    let videoIndex = videoInfo.videoIndex
    for (const segment in videoIndex) {
        let params = commandTemplate(videoIndex[segment].start, segment)
        let process = async () => {
            await killCurrentProcess(segment)
            currentProcess = this
            event.emit('setCurrentProcess',currentProcess)
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
            ffmpeg.stderr.on('data', async function (stderrLine) {
                currentProcess = ffmpeg
                stderrLine = stderrLine.toString()
                transcodeLogger.debug('debug', `~${stderrLine}`);
                // logger.debug('debug',`${stderrLine} ${Boolean(stderrLine.match(/Opening.*for writing/))} ${stderrLine.search(/m3u8/) == -1}`);
                if (/Opening.*for writing/.test(stderrLine) && !/m3u8/i.test(stderrLine)) {
                    let writingSegment = path.parse(path.parse(/'.*'/.exec(stderrLine)[0]).name).name
                    let writingSegmentId = Number(writingSegment.replace('index', ''))
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
    } catch (error) {
        logger.error('generateTsQueue',error)
    }

}

module.exports = {generateTsQueue,killCurrentProcess}