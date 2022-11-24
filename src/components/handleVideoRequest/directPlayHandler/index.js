const path = require('path');
const fs = require('fs');
const { generatePictureUrl,mediaContentType } = require('../../../utils');
const { stat } = require('fs/promises');
const { logger } = require('../../../utils/logger');

var _this
//处理直接播放
class directPlayHandler {
  constructor(videoInfo) {
    _this = this
    this.filePath = videoInfo.filePath
    this.contentType = mediaContentType(this.filePath)
  }
  handler = (app) => {
    try {
      logger.info('directPlayHandler handler', 'init',_this.filePath)
      let used = app._router.stack.findIndex(v => v.regexp.toString().includes('directPlay'))
      if (used < 0) {
        app.use('/api/localFile/directPlay', async (req, res) => {
          try {
            logger.debug('directPlayHandler handler /api/localFile/directPlay', 'start')
            const filePath = _this.filePath
            logger.info('directPlayHandler handler /api/localFile/directPlay',filePath,range);
            const fileState = await stat(filePath)
            const fileSize = fileState.size
            const range = req.headers.range
            
            if (range) {
              const parts = range.replace(/bytes=/, "").split("-")
              const start = parseInt(parts[0], 10)
              const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1
    
              if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                return
              }
    
              const chunksize = (end - start) + 1
              const file = fs.createReadStream(filePath, { start, end })
              const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': _this.contentType,
              }
    
              res.writeHead(206, head)
              file.pipe(res)
            } else {
              const head = {
                'Content-Length': fileSize,
                'Content-Type': _this.contentType,
              }
              res.writeHead(200, head)
              fs.createReadStream(filePath).pipe(res)
            }
    
            logger.info('directPlayHandler handler /api/localFile/directPlay', 'end',range)
          } catch (error) {
            logger.error('directPlayHandler handler /api/localFile/directPlay', error)
            
          }
        })
      }
    } catch (error) {
      logger.error('directPlayHandler handler', error)
    }

  }
}

module.exports = directPlayHandler