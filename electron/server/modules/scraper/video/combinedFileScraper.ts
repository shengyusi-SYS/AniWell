import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata } from '@s/store/library'
import { vidoeHash, getFileType } from '@s/utils'
import { scrapeLogger } from '@s/utils/logger'
import path, { basename } from 'path'
import fs from 'fs'
import got from 'got'
import settings from '@s/store/settings'
import init from '@s/utils/init'

//弹弹新接口貌似还有问题

interface opt {
    url: string
    method: string
    headers: {
        'Content-Type': string
        Accept: string
        'Accept-Encoding': string
        'User-Agent': string
    }
    timeout: {
        request: number
    }
    json: {
        requests: Array<{ fileName: string; fileHash: string; matchMode: string }>
    }
    responseType: string
}

type fileMetadata = FileMetadata & {
    baseInfo: AppendedMetadata
}

export function genarateOption(fileMetadata: fileMetadata): opt['json']['requests'][0] {
    const filePath = fileMetadata.baseInfo.path
    const fileHash = fileMetadata.baseInfo.hash
    const fileName = basename(filePath)

    if (fileHash) {
        var matchMode = 'hashAndFileName'
    } else {
        matchMode = 'fileNameOnly'
    }

    return {
        fileName: encodeURIComponent(fileName),
        fileHash,
        matchMode,
    }
}

const taskList: opt[] = []
const queryList = []

export default async function match(flatFile: {
    [path: string]: fileMetadata
}): Promise<ScraperResult> {
    const fileList = Object.values(flatFile)
    const hashList = [...new Set(fileList.map((v) => v.baseInfo.hash).filter((v) => v))]
    const queryList = hashList.map((hash) => fileList.find((val) => val.baseInfo.hash === hash))
    queryList.reduce((pre: opt | undefined, fileMetadata, ind, arr) => {
        const template: opt = {
            url: `https://api.dandanplay.net/api/v2/match`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip',
                'User-Agent': init.APPNAME + ' ' + init.VERSION,
            },
            timeout: {
                request: 120000,
            },
            json: {
                requests: [genarateOption(fileMetadata)],
            },
            responseType: 'json',
        }
        if (!pre) {
            return template
        } else {
            if (ind < arr.length - 1) {
                if (pre.json.requests.length < 32) {
                    pre.json.requests.push(genarateOption(fileMetadata))
                    return pre
                } else {
                    taskList.push(pre)
                    return template
                }
            } else {
                if (pre.json.requests.length < 32) {
                    pre.json.requests.push(genarateOption(fileMetadata))
                    taskList.push(pre)
                } else {
                    taskList.push(template)
                }
            }
        }
    }, undefined)

    console.log(taskList[0].json, taskList[0].json.requests.length, hashList.length, '~~~')

    // const dandanResults = await Promise.allSettled(taskList.map((opt) => got(opt)))
    // dandanResults.forEach((v) => {
    //     if (v.status === 'fulfilled') {
    //         console.log(v.value.body)
    //     }
    // })

    return
}
