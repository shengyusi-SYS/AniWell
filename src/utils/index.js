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
async function vidoeHashS(filePath) {
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


function readChunkSync(filePath, { length, startPosition }) {
    let buffer = Buffer.alloc(length);
    const fileDescriptor = fs.openSync(filePath, 'r');

    try {
        const bytesRead = fs.readSync(fileDescriptor, buffer, {
            length,
            position: startPosition,
        });

        if (bytesRead < length) {
            buffer = buffer.subarray(0, bytesRead);
        }

        return buffer;
    } finally {
        fs.closeSync(fileDescriptor);
    }
}

async function vidoeHash(filePath) {
    try {
        const hash = crypto.createHash('md5')
        // console.log('start', filePath);
        const chunk = readChunkSync(filePath, { length: 1024 * 1024 * 16 })
        const md5 = hash.update(chunk, 'utf8').digest('hex')
        console.log('end', filePath);
        return Promise.resolve(md5)
    } catch (error) {
        return Promise.reject
    }

}

class TaskPool {
    constructor(tasksLimit) {
        if (tasksLimit < 0) {
            throw new Error('Limit cant be lower than 0.');
        }
        this.tasksQueue = [];
        this.tasksActiveCount = 0;
        this.tasksLimit = tasksLimit;
    }

    registerTask(handler) {
        this.tasksQueue = [...this.tasksQueue, handler];
        this.executeTasks();
    }

    executeTasks() {
        while (this.tasksQueue.length && this.tasksActiveCount < this.tasksLimit) {
            const task = this.tasksQueue[0];
            this.tasksQueue = this.tasksQueue.slice(1);
            this.tasksActiveCount += 1;

            task()
                .then((result) => {
                    this.tasksActiveCount -= 1;
                    this.executeTasks();
                    return result;
                })
                .catch((err) => {
                    this.tasksActiveCount -= 1;
                    this.executeTasks();
                    throw err
                });
        }
    }

    task(handler) {
        return new Promise((resolve, reject) =>
            this.registerTask(() =>
                handler()
                    .then(resolve)
                    .catch(reject),
            ),
        );
    }
}


//获取树形文件夹内容，异步
async function readDirTree(dirPath, dirTree = {}, id = 0) {
    let queue = []
    dirTree.label = path.basename(dirPath)
    let curList = []
    try {
        curList = await readdir(dirPath)
        dirTree.children = []
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let res = { label: v }
                let newPath = path.join(dirPath, v)
                let newTree = {}
                let newDir = []
                newDir = await readDirTree(newPath, newTree)
                if (newDir) {
                    res = newDir
                }
                dirTree.children.push(res)
                resolve()
            }))
        })
    } catch (error) {
        // console.log(id,dirTree.label);
        return false
    }
    try {

        await Promise.all(queue)
    } catch (error) {
    }
    console.log(id, dirTree);
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
                res = newDir
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
const defaultAppend = {
    fileFilter: async (filePath) => true,
    appendFileInfo: async (filePath) => { },
    appendDirInfo: async (dirTree, deep) => { },
    callback: async (dirTree) => { },
    deepLimit: 0,
    deep: 0,
    tag: {}
}
async function appedDirTree(dirPath = '', dirTree = {}, append = defaultAppend) {
    append = { ...defaultAppend, ...append }
    let { appendFileInfo, appendDirInfo, fileFilter, deep, callback, deepLimit, tag } = append
    if (deepLimit !== 0 && deep == deepLimit) {
        return false
    }
    let queue = []
    let curList = []
    dirTree.label = path.basename(dirPath)
    dirTree.children = []
    dirTree.path = dirPath
    try {
        curList = await readdir(dirPath)
    } catch (error) {
        // console.log('readdir error~~~~~~~~~~~~~~~~~~~~~~~',dirPath,error);
        let filePath = dirPath
        try {
            let fileInfo = await appendFileInfo(filePath)
            return { label: path.basename(filePath), ...fileInfo }
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
                    newDir = await appedDirTree(path.join(dirPath, v), {}, { appendFileInfo, appendDirInfo, fileFilter, tag, deep: deepLimit != 0 ? deep < deepLimit ? deep + 1 : deepLimit : deep + 1, deepLimit })
                    if (newDir) {
                        dirTree.children.push(newDir)
                    }
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
    await appendDirInfo(dirTree, deep,tag)
    await callback(dirTree)
    // console.log('-----------------------', deep, dirTree);
    return dirTree
}

//获取文件类型
async function getFileType(filePath) {
    const { fileTypeFromFile } = await import('file-type')
    try {
        let res = await fileTypeFromFile(filePath)
        if (res) {
            res = res.mime.split('/')[0]
        }
        return res
    } catch (error) {
        return false
    }
}

const defaultDeepMergerParams={
    keyword:'',
    depth:0,
    depthLimit:0
}

const deepMerge = (toB, addA, params=defaultDeepMergerParams) => {
    let {keyword,depth,depthLimit} = {...defaultDeepMergerParams,...params}
    if (!depthLimit==0&&depth>=depthLimit) {
        return toB
    }
    if (toB instanceof Object && addA instanceof Object) {
        if (toB instanceof Array && addA instanceof Array) {
            addA.forEach(v => {
                let addVal = v
                let exist
                if (keyword) {
                    exist = toB.find(val => val[keyword] === v[keyword])
                } else exist = toB.find(val => val === v)
                if (!exist) {
                    toB.push(addVal)
                } else {
                    if (typeof exist == 'object' && typeof addVal == 'object') {
                        deepMerge(exist, addVal, {keyword,depth:depth+1,depthLimit})
                    }
                }
            })
        } else {
            for (const key in addA) {
                let exist = toB[key]
                let addVal = addA[key]
                if (!exist) {
                    toB[key] = addVal
                } else {
                    if (typeof exist == 'object' && typeof addVal == 'object') {
                        deepMerge(exist, addVal, {keyword,depth:depth+1,depthLimit})
                    } else if (exist !== addVal) {
                        toB[key] = addVal
                    }
                }
            }
        }
    }
    return toB
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
    deepMerge,
    Seven,
    event,
    rimraf,
    TaskPool
}