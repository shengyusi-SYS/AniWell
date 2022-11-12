const path = require('path');
const fs = require('fs');
const Ffmpeg = require('fluent-ffmpeg');

console.log(path.parse(path.resolve('./settings.json')))
let settings = JSON.parse(fs.readFileSync(path.resolve('./settings.json')))

function checkSegment(start=0,end=20,temp = settings.tempPath) {
    function getVideoInfo(filePath) {
      return new Promise((r, j) => {
          Ffmpeg.ffprobe(filePath, function (err, metadata) {
              if (err) {
                  return j(err)
              }
              let {
                  bit_rate,
                  duration
              } = { ...metadata.format }
              let vidoeStream = metadata.streams.find((v) => {
                  return v.codec_type == 'video'
              })
              let audioStream = metadata.streams.find((v) => {
                  return v.codec_type == 'audio'
              })
              let subtitleStream = []
              metadata.streams.forEach((v) => {
                  if (v.codec_type == 'subtitle') {
                      subtitleStream.push(v)
                  }
              })
              let {
                  codec_name,
                  width,
                  height,
                  pix_fmt,
                  r_frame_rate,
                  color_space,
                  index,
                  start_pts,
                  duration_ts
              } = { ...vidoeStream }
              let videoInfo = {
                  // index,
                  start_pts,
                  duration_ts,
                  // codec: codec_name,
                  // audioCodec: audioStream.codec_name,
                  // bitrate: bit_rate,
                  duration,
                  // width,
                  // height,
                  // frame_rate: r_frame_rate.split('/')[0] / 1000,
                  // pix_fmt,
                  // colorSpace: color_space,
                  // subtitleStream
              }
              // console.log(videoInfo);
              return r(videoInfo)
          })
      }).catch(e => console.log(e))
    }
    let list = []
    for (let index = start; index < end; index++) {
      const file = path.resolve(temp,`index${index}.ts`)
     list.push(getVideoInfo(file))
    }
    Promise.all(list).then((result) => {
      let arr = []
      result.forEach(v=>{
        arr.push(v)
      })
      console.log(arr);
      fs.writeFileSync(path.resolve(settings.tempPath, 'output', 'test.json'), JSON.stringify(arr, '', '\t'))
    }).catch((err) => {
      
    });
    
}

module.exports = checkSegment

// console.log(process.env.FLUENTFFMPEG_COV);