import { scrapeLogger } from '@s/utils/logger'
import { spawnSync, spawn } from 'child_process'
import settings from '@s/store/settings'
import path, { basename, dirname, extname, resolve } from 'path'
import init from '@s/utils/init'
import paths from '../envPath'
import { access, mkdir } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { getMediaInfo } from './info'

export async function extractPicture({
    inputPath = '',
    outputPath = resolve(inputPath).replace(extname(inputPath), '.jpg'),
    overwrite = false,
}): Promise<string> {
    try {
        await access(outputPath)
        if (!overwrite) {
            return outputPath
        }
    } catch (error) {}
    try {
        const duration = (await getMediaInfo(inputPath)).format.duration
        if (!duration) return undefined
        return await new Promise((resolve, reject) => {
            scrapeLogger.debug('pictureExtractor start', inputPath, duration)
            const task = spawn(
                init.ffmpegPath,
                [
                    `-ss ${duration / 8}`,
                    `-i "${path.resolve(inputPath)}"`,
                    '-frames:v 1',
                    // '-q:v 1',
                    // '-update 1',
                    '-s 1280x720',
                    '-f webp',
                    // '-preset drawing',
                    // '-quality 90',
                    // '-lossless 1',
                    '-compression_level 6',
                    '-hide_banner',
                    '-y',
                    path.resolve(outputPath),
                ],
                { shell: true },
            )
            task.on('exit', (code) => {
                if (code === 0) {
                    scrapeLogger.debug('pictureExtractor end', inputPath)
                    resolve(outputPath)
                } else {
                    scrapeLogger.error('pictureExtractor exit err', inputPath)
                    reject(code)
                }
            })
            task.on('error', (err) => {
                scrapeLogger.error('pictureExtractor error', inputPath, err)
                reject(err)
            })
        })
    } catch (error) {
        scrapeLogger.error('pictureExtractor', error)
        return undefined
    }
}

export async function cutVideo(
    filePath: string,
    savePath: string = resolve(paths.temp, 'cut', uuidv4() + '.mp4'),
    length = 0.01,
) {
    return new Promise<string>((resolve, reject) => {
        const task = spawn(
            init.ffmpegPath,
            [
                `-i "${filePath}"`,
                '-map v:0',
                `-t ${length}`,
                '-hide_banner',
                '-c copy',
                '-y',
                savePath,
            ],
            {
                shell: true,
            },
        )
        task.on('exit', (code) => {
            if (code === 0) {
                resolve(savePath)
            } else {
                scrapeLogger.error(
                    [
                        `-i "${filePath}"`,
                        '-map v:0',
                        `-t ${length}`,
                        '-hide_banner',
                        '-c copy',
                        '-y',
                        savePath,
                    ].join(' '),
                )
                reject()
            }
        })
        task.on('error', (e) => {
            scrapeLogger.error(e)
            reject(e)
        })
    })
}
