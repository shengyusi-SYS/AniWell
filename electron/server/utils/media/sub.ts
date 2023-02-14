import { getScreenedMediaInfo } from './getMediaInfo'
import settings from '@s/store/settings'
import path from 'path'
import { spawnSync, spawn } from 'child_process'
import { createReadStream, createWriteStream, ReadStream } from 'fs'
// import { Transform } from 'stream'
import init from '@s/utils/init'

export async function toWebvtt(input: string | ReadStream): Promise<Buffer> {
    const result = []
    if (typeof input === 'string') {
        var subIn = createReadStream(input)
    } else subIn = input
    const ffmpegPath = settings.get('ffmpegPath')
        ? `"${path.resolve(settings.get('ffmpegPath'), `ffmpeg${init.ffmpegSuffix}`)}"`
        : 'ffmpeg'
    return new Promise((resolve, reject) => {
        const pro = spawn(ffmpegPath, ['-i -', '-hide_banner', '-f webvtt', '-'], {
            shell: true,
        })
        pro.stdout.on('data', (data) => {
            result.push(data)
        })
        pro.stderr.on('data', (data) => {
            // console.log('info----------------', data.toString())
        })
        pro.on('error', (err) => {
            // console.log(err)
        })
        pro.on('exit', (code, sig, c) => {
            if (code === 0) {
                subIn.unpipe(pro.stdin)
                resolve(Buffer.concat(result))
            } else {
                reject({ code, sig, c })
            }
        })
        subIn.pipe(pro.stdin)
    })
}

export async function extractSub({
    targetCodec = 'ass',
    subPath,
    subIndex = 0,
}: {
    targetCodec: string
    subPath: string
    subIndex?: number
}): Promise<Buffer> {
    const ffmpegPath = settings.get('ffmpegPath')
        ? `"${path.resolve(settings.get('ffmpegPath'), `ffmpeg${init.ffmpegSuffix}`)}"`
        : 'ffmpeg'
    const result = []
    const subIn = createReadStream(subPath)
    return new Promise((resolve, reject) => {
        const pro = spawn(
            ffmpegPath,
            ['-i -', '-hide_banner', `-map 0:s:${subIndex}`, `-f ${targetCodec}`, '-'],
            {
                shell: true,
            },
        )
        pro.stdout.on('data', (data) => {
            result.push(data)
        })
        pro.stderr.on('data', (data) => {
            // console.log('info----------------', data.toString())
        })
        pro.on('error', (err) => {
            // console.log(err)
        })
        pro.on('exit', (code, sig, c) => {
            if (code === 0) {
                subIn.unpipe(pro.stdin)
                resolve(Buffer.concat(result))
            } else {
                reject({ code, sig, c })
            }
        })
        subIn.pipe(pro.stdin)
    })
}
