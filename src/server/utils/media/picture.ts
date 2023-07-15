import { spawn } from "child_process"
import init from "@s/utils/init"
import { createReadStream, ReadStream } from "fs"
import { bufferToStream } from ".."
import { Readable } from "stream"
import { basename, dirname } from "path"

export async function toWebp(input: string | Buffer | ReadStream | Readable): Promise<Buffer> {
    return await new Promise(async (resolve, reject) => {
        const task = spawn(
            basename(init.ffmpegPath),
            [`-i -`, "-f webp", "-quality 75", "-hide_banner", "-y", "-"],
            { shell: true, cwd: dirname(init.ffmpegPath) },
        )

        if (typeof input === "string") input = createReadStream(input)
        else if (Buffer.isBuffer(input)) input = bufferToStream(input)

        const message = []
        task.stderr.on("data", (data) => {
            message.push(data.toString())
            if (
                data
                    .toString()
                    .includes("deprecated pixel format used, make sure you did set range correctly")
            ) {
                message.push("pix_fmt error")
                task.kill()
                reject(message)
            }
        })
        setTimeout(() => {
            reject(message)
        }, 10000)

        const output: Buffer[] = []
        task.stdout.on("data", (chunk) => {
            output.push(chunk)
        })

        task.on("exit", (code) => {
            if (code === 0) {
                resolve(Buffer.concat(output))
            } else {
                reject(code)
            }
        })

        task.on("error", (err) => {
            reject(err)
        })

        input.pipe(task.stdin)
    })
}
