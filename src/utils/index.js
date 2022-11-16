const { settings } = require('./init');
const { logger } = require('./logger');
const rimraf = require('rimraf');
const { EventEmitter } = require('events');
const path = require('path');
const event = new EventEmitter();
const sevenBin = require('7zip-bin');
const pathTo7zip = sevenBin.path7za
const Seven = require('node-7z');
const { readdir, mkdir, rename } = require('fs/promises');
var crypto = require('crypto');
const fs = require('fs');

//清理空字符串和数组（ffmpeg指令用）
function cleanNull(arr) {
    let temp = []
    arr.forEach(v => {
        if (v.length > 0 || typeof v == 'function') {
            temp.push(v)
        }
    })
    return temp
}

function generatePictureUrl(path) {
    return `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
}
//MIME type
function mediaContentType(name) {
    const type = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/mp4',
        // '.mkv':'video/x-matroska'
    }
    return type[path.extname(name)]
}

//解压同路径下的fonts压缩包到fontsDir
async function extractFonts(packPath, fontsDir) {
    if (!fontsDir) {
        fontsDir = path.resolve(settings.tempPath, 'fonts')
        logger.debug('utils extractFonts', fontsDir)
    }
    try {
        await new Promise((resolve, reject) => {
            rimraf(fontsDir, err => resolve())
        })
        await mkdir(fontsDir)
    } catch (error) {
    }
    await new Promise((resolve, reject) => {
        let stream = Seven.extractFull(packPath, fontsDir, {
            recursive: true,
            $bin: pathTo7zip
        })
        stream.on('end', function () {
            resolve()
        })
        stream.on('error', (err) => resolve(err))
    })
    let dirContent = await readdir(fontsDir)
    if (dirContent.length == 1) {
        let fontsList = []
        let tempDir = path.join(fontsDir, dirContent[0])
        dirContent = await readdir(tempDir)
        dirContent.forEach(v => {
            fontsList.push(rename(path.join(tempDir, v), path.join(fontsDir, v)).catch(e => Promise.resolve()))
        })
        await Promise.all(fontsList)
    }
}
//列出fonts压缩包内容
function listFonts(packPath) {
    return Seven.list(packPath, {
        $bin: pathTo7zip
    })
}
//计算视频hash，弹弹play模式
async function vidoeHash(filePath) {
    const hash = crypto.createHash('md5')
    return await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { end: 1024 * 1024 * 16 - 1 })
        stream.on('data', chunk => {
            hash.update(chunk, 'utf8');
        });
        stream.on('end', () => {
            const md5 = hash.digest('hex');
            resolve(md5)
        });
    })
}
//获取树形文件夹内容，异步
async function readDirTree(dirPath, dirTree = {}) {
    let queue = []
    dirTree.label = path.basename(dirPath)
    dirTree.children = []
    let curList = []
    try {
        curList = await readdir(dirPath)
    } catch (error) {
        return Promise.reject()
    }
    try {
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let res = { label: v }
                let newPath = path.join(dirPath, v)
                let newTree = {}
                let newDir = []
                try {
                    newDir = await readDirTree(newPath, newTree)
                } catch (error) {
                    newDir = false
                }
                if (newDir) {
                    res.children = newDir
                }
                dirTree.children.push(res)
                resolve()
            }))
        })
    } catch (error) {
        return false
    }
    await Promise.all(queue)
    return dirTree
}

//获取树形文件夹内容，同步
function readDirTreeSync(dirPath, dirTree = {}) {
    try {
        let curList = fs.readdirSync(dirPath)
        dirTree.label = path.basename(dirPath)
        dirTree.children = []
        curList.forEach(v => {
            let res = { label: v }
            let newPath = path.join(dirPath, v)
            let newTree = {}
            let newDir = readDirTreeSync(newPath, newTree)
            if (newDir) {
                res.children = newDir
            }
            dirTree.children.push(res)
        })
        return dirTree
    } catch (error) {
        return false
    }
}

// 获取树形文件夹内容,异步,
// 在遇到文件时执行fileFilter和appendFileInfo函数,
// fileFilter需要返回Boolen，为false时在树中忽略此文件，appendFileInfo将返回值设为文件的fileInfo;
// 遇到目录时执行appendDirInfo函数，可以获取到文件的fileInfo,
async function appedDirTree(dirPath = '', dirTree = {}, appendFileInfo = async (filePath) => { }, appendDirInfo = async (dirTree) => { }, fileFilter = async (filePath) => true) {
    let queue = []
    let curList = []
    dirTree.label = path.basename(dirPath)
    dirTree.children = []
    try {
        curList = await readdir(dirPath)
    } catch (error) {
        let filePath = dirPath
        try {
            let fileInfo = await appendFileInfo(filePath)
            return Promise.reject(fileInfo)
        } catch (error) {
            console.log('fileInfo', error);
        }
    }
    try {
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let pass = true
                if (fileFilter) {
                    try {
                        await readdir(path.join(dirPath, v))
                    } catch (error) {
                        pass = await fileFilter(path.join(dirPath, v))
                    }
                }
                if (pass) {
                    let res = { label: v }
                    let newPath = path.join(dirPath, v)
                    let newTree = {}
                    let newDir = []
                    try {
                        newDir = await appedDirTree(newPath, newTree, appendFileInfo, appendDirInfo, fileFilter)
                    } catch (error) {
                        if (typeof error == 'object') {
                            res.fileInfo = error
                        }
                        newDir = false
                    }
                    if (newDir) {
                        // await appendDirInfo(newDir)
                        res.children = newDir
                    }
                    dirTree.children.push(res)
                }
                resolve()
            }))

        })
    } catch (error) {
        return false
    }
    try {

        await Promise.all(queue)
    } catch (error) {
        console.log('Promise.all', error);
    }
    await appendDirInfo(dirTree)
    return dirTree
}

//获取文件类型
async function getFileType(filePath) {
    const { fileTypeFromFile } = await import('file-type')
    try {
        let res = await fileTypeFromFile(filePath)
        res = res.mime.split('/')[0]
        return res
    } catch (error) {
        return false
    }
}

module.exports = {
    cleanNull,
    generatePictureUrl,
    mediaContentType,
    extractFonts,
    listFonts,
    vidoeHash,
    readDirTree,
    readDirTreeSync,
    appedDirTree,
    getFileType,
    Seven,
    event,
    rimraf,
}