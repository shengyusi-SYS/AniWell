import { spawn } from 'child_process'
import init from '@s/utils/init'
import { createReadStream, ReadStream } from 'fs'
import { bufferToStream } from '..'
import { Readable } from 'stream'

export async function toWebp(input: string | Buffer | ReadStream | Readable): Promise<Buffer> {
    return await new Promise(async (resolve, reject) => {
        const task = spawn(
            init.ffmpegPath,
            [`-i -`, '-f webp', '-compression_level 6', '-hide_banner', '-y', '-'],
            { shell: true },
        )

        if (typeof input === 'string') input = createReadStream(input)
        else if (Buffer.isBuffer(input)) input = bufferToStream(input)

        input.pipe(task.stdin)

        const output: Buffer[] = []

        task.stdout.on('data', (chunk) => {
            output.push(chunk)
        })
        task.on('exit', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(output))
            } else {
                reject(code)
            }
        })
        task.on('error', (err) => {
            reject(err)
        })
    })
}
