const path = require('path');
const { Ffmpeg } = require('../../../utils/init');
const { event, TaskPool } = require('../../../utils');
const { scrapeLogger } = require('../../../utils/logger');
// const getVideoInfo = require('../../handleVideoRequest/getVideoInfo');
// var taskQueue=new TaskPool(1)
// console.log('pictureExtractor');
// event.on('grabPicture',(inputPath, outputPath, startTime)=>{
//    taskQueue.task(async()=>{await pictureExtractor(inputPath, outputPath, startTime)})
// })

async function pictureExtractor(inputPath = '', outputPath = '') {
  try {
    var duration = await new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(inputPath, async (err, metadata) => {
        let { duration } = metadata.format
        resolve(duration)
      })
    })
  } catch (error) {
    duration = 180
  }
  await new Promise((resolve, reject) => {
    scrapeLogger.info('pictureExtractor start', inputPath,duration)
    Ffmpeg(path.resolve(inputPath))
      .inputOptions([`-ss ${duration / 8}`])
      .outputOptions([
        '-frames:v 1',
        '-q:v 1',
        '-update 1',
        '-s 1280x720',
        // '-f webp',
        // '-preset drawing',
        // '-quality 90',
        // '-lossless 1',
        // '-compression_level 6'
      ])
      .output(path.resolve(outputPath))
      .on('end', function () {
        scrapeLogger.debug('pictureExtractor end', inputPath)
        resolve()
      })
      // .on('stderr', function (stderrLine) {
      //   console.log('Stderr output: ' + stderrLine);
      // })
      .on('error', function (err) {
        scrapeLogger.error('pictureExtractor err', inputPath, err.message)
        reject()
      })
      .run()
  })
  return outputPath
}

module.exports = pictureExtractor

