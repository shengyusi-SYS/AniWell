import { getScreenedMediaInfo } from "./info"
import settings from "@s/store/settings"
import path, { basename, dirname } from "path"
import { spawnSync, spawn } from "child_process"
import { createReadStream, createWriteStream, ReadStream } from "fs"
// import { Transform } from 'stream'
import init from "@s/utils/init"
import { readFile } from "fs/promises"
import { logger } from "../logger"

//ass转vtt
export async function toWebvtt(input: string | ReadStream): Promise<Buffer> {
    const result = []
    if (typeof input === "string") {
        var subIn = createReadStream(input)
    } else subIn = input
    return new Promise((resolve, reject) => {
        const pro = spawn(basename(init.ffmpegPath), ["-i -", "-hide_banner", "-f webvtt", "-"], {
            shell: true,
            cwd: dirname(init.ffmpegPath),
        })
        pro.stdout.on("data", (data) => {
            result.push(data)
        })
        pro.stderr.on("data", (data) => {
            // console.log('info----------------', data.toString())
        })
        pro.on("error", (err) => {
            // console.log(err)
        })
        pro.on("exit", (code, sig, c) => {
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

//从视频文件中提取字幕流
export async function extractSub({
    targetCodec = "ass",
    subPath,
    subIndex = 0,
}: {
    targetCodec: string
    subPath: string
    subIndex?: number
}): Promise<Buffer> {
    logger.debug("extractSub", [targetCodec, subPath, subIndex])
    const result = []
    const subIn = createReadStream(subPath)
    if (targetCodec === "subrip") {
        targetCodec = "srt"
    }
    return new Promise((resolve, reject) => {
        const pro = spawn(
            basename(init.ffmpegPath),
            ["-i -", "-hide_banner", `-map 0:s:${subIndex}`, `-f ${targetCodec}`, "-"],
            {
                shell: true,
                cwd: dirname(init.ffmpegPath),
            },
        )
        pro.stdout.on("data", (data) => {
            result.push(data)
        })
        pro.stderr.on("data", (data) => {
            logger.debug("extractSub----------------", data.toString())
        })
        pro.on("error", (err) => {
            logger.error("extractSub error", err)
            // console.log(err)
        })
        pro.on("exit", (code, sig, c) => {
            if (code === 0) {
                subIn.unpipe(pro.stdin)
                resolve(Buffer.concat(result))
            } else {
                reject({ code, sig, c })
            }
        })
        try {
            subIn.pipe(pro.stdin)
        } catch (error) {
            logger.error("extractSub error", error)
        }
    })
}

//根据ass字幕内容提取需要的字体列表
export async function getSubFontsList({
    subPath,
    subContent,
}: {
    subPath?: string
    subContent?: string | Buffer
}) {
    if (!subPath && !subContent) {
        throw new Error("need subPath/subContent")
    }
    if (subPath) {
        subContent = (await readFile(subPath)).toString()
    }
    if (subContent instanceof Buffer) {
        subContent = subContent.toString()
    }

    const reg = /Style: .+?( |,)(?<fontName>.+?),.+?/gi
    const neededFonts = subContent.matchAll(reg)
    const fontsList: Set<string> = new Set()
    for (const {
        groups: { fontName },
    } of neededFonts) {
        fontsList.add(fontName)
    }
    return Array.from(fontsList)
}
