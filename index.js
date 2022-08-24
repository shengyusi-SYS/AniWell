import ffmpeg from 'ffmpeg.js';
import got from 'got';
import fs from 'fs';
import cookieParser from 'cookie-parser';

import express from 'express';
import proxyMw from 'http-proxy-middleware';
const proxy = proxyMw.createProxyMiddleware;
const app = express();
const qbHost = 'http://localhost:8888'
const serverPort = 9000
app.use('/api/transcode', express.json())
app.use('/api/transcode', cookieParser())
app.use('/api/transcode', (req, res, next) => {
    let body = req.body
    let cookies = req.cookies
    let suffix = body.name.split('.').slice(-1)[0]
    let authority = false
    let formatList = {
        text: ['txt'],
        video: ['mkv', 'mp4'],
        picture: ['jpg', 'png'],
        audio: ['mp3', 'wav', 'flac']
    }
    let fileType
    got({
        url: `${qbHost}/api/v2/auth/login`,
        method: 'POST',
        headers: {
            cookie: `SID=${cookies.SID}`
        }
    }).then((result) => {
        result = result.body
        if (result == 'Ok.') {
            authority = true
        } else {
            throw new Error('无权限，请重新登录')
        }
        for (const key in formatList) {
            if (formatList[key].includes(suffix)) {
                fileType = key
            }
        }
        try {
            let filePath = `${body.rootPath}\\${body.name}`
            let result
            if (fileType == 'text') {
                result = fs.readFileSync(filePath)
            } else if (fileType == 'video') {
                throw new Error('暂不支持')
            } else if (fileType == 'picture') {
                throw new Error('暂不支持')
            } else if (fileType == 'audio') {
                throw new Error('暂不支持')
            }
            res.send(result)
            return
        } catch (error) {
            res.status(403).send(error.message)
            return
        }
    }).catch((err) => {
        res.status(401).send(error.message)
        return
    });
})
app.use("/api/v2", proxy({ target: qbHost, changeOrigin: true }));
app.listen(serverPort);