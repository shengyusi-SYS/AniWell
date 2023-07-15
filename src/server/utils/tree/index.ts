import path from "path"
import fs from "fs"
import { readdir } from "fs/promises"
import { logger } from "../logger"

export interface Tree {
    label: unknown
    children?: Array<Tree>
    path?: string
    [key: string]: unknown
}

//获取树形文件夹内容，异步
async function readDirTree(dirPath: string, dirTree: Tree = {}, id = 0): Promise<Tree | false> {
    const queue = []
    dirTree.label = path.basename(dirPath)
    let curList = []
    try {
        curList = await readdir(dirPath)
        dirTree.children = []
        curList.forEach((v) => {
            queue.push(
                new Promise(async (resolve, reject) => {
                    let res: Tree = { label: v }
                    const newPath = path.join(dirPath, v)
                    const newTree = {}
                    const newDir = await readDirTree(newPath, newTree)
                    if (newDir) {
                        res = newDir
                    }
                    dirTree.children.push(res)
                    resolve(null)
                }),
            )
        })
    } catch (error) {
        // console.log(id,dirTree.label);
        return false
    }
    try {
        await Promise.all(queue)
    } catch (error) {}
    // console.log(id, dirTree);
    return dirTree
}

//获取树形文件夹内容，同步
function readDirTreeSync(dirPath, dirTree: Tree = {}): Tree | false {
    try {
        const curList = fs.readdirSync(dirPath)
        dirTree.label = path.basename(dirPath)
        dirTree.children = []
        curList.forEach((v) => {
            let res: Tree = { label: v }
            const newPath = path.join(dirPath, v)
            const newTree = {}
            const newDir = readDirTreeSync(newPath, newTree)
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

/*
fileFilter：文件过滤器,需要返回Boolen，为false时在树中忽略此文件
appendFileInfo：需要返回Object，结果会与当前文件信息同层合并
appendDirInfo：可以获取到当前文件夹及其子项的信息
callback：回调
deepLimit：深度限制
deep：当前深度
tag：可以附加其它信息
我知道单词拼写不对，还用了一些愚蠢的方法，有空再改...
*/
interface append {
    fileFilter?: (filePath: string) => Promise<boolean>
    appendFileInfo?: (filePath: string, tag?: unknown) => Promise<object | void>
    appendDirInfo?: (dirTree: Tree, deep?: number, tag?: unknown) => Promise<boolean | void>
    callback?: (dirTree: Tree) => void
    deepLimit?: number
    deep?: number
    tag?: unknown
}

const defaultAppend: append = {
    fileFilter: async (filePath) => true,
    appendFileInfo: async (filePath, tag) => {},
    appendDirInfo: async (dirTree, deep, tag) => {},
    callback: async (dirTree) => {},
    deepLimit: 0,
    deep: 0,
    tag: {},
}
async function appedDirTree(dirPath = "", dirTree: Tree = {}, append = defaultAppend) {
    try {
        append = { ...defaultAppend, ...append }
        const { appendFileInfo, appendDirInfo, fileFilter, deep, callback, deepLimit, tag } = append
        //深度限制，貌似效率有限
        if (deepLimit !== 0 && deep == deepLimit) {
            return false
        }
        const queue = []
        let curList = []
        dirTree.label = path.basename(dirPath)
        dirTree.children = []
        dirTree.path = dirPath
        try {
            curList = await readdir(dirPath)
            // console.log(dirPath,curList);
        } catch (error) {
            // console.log('readdir error~~~~~~~~~~~~~~~~~~~~~~~',dirPath,error);
            const filePath = dirPath
            try {
                const baseInfo = await appendFileInfo(filePath, tag)
                return { label: path.basename(filePath), ...baseInfo }
            } catch (error) {
                logger.error("baseInfo", error)
            }
        }
        try {
            curList.forEach((v) => {
                queue.push(
                    new Promise(async (resolve, reject) => {
                        let pass = true
                        if (fileFilter) {
                            try {
                                await readdir(path.join(dirPath, v))
                            } catch (error) {
                                pass = await fileFilter(path.join(dirPath, v))
                            }
                        }
                        if (pass) {
                            const newDir = await appedDirTree(
                                path.join(dirPath, v),
                                {},
                                {
                                    appendFileInfo,
                                    appendDirInfo,
                                    fileFilter,
                                    tag,
                                    deep:
                                        deepLimit != 0
                                            ? deep < deepLimit
                                                ? deep + 1
                                                : deepLimit
                                            : deep + 1,
                                    deepLimit,
                                },
                            )
                            if (newDir) {
                                dirTree.children.push(newDir)
                            }
                        }
                        resolve(null)
                    }),
                )
            })
        } catch (error) {
            return false
        }
        try {
            await Promise.all(queue)
        } catch (error) {
            logger.error("Promise.all", error)
        }
        await appendDirInfo(dirTree, deep, tag)
        await callback(dirTree)
        // console.log('-----------------------', deep, dirTree);
        return dirTree
    } catch (error) {
        logger.error(error)
    }
}

//根据给定路径搜索dirTree中的信息
function searchLeaf(dirTree: Tree, targetPath = ""): Tree | false {
    try {
        if (dirTree.path === targetPath) {
            return dirTree
        }
        while (!dirTree.path) {
            let rootLeaf = false
            dirTree = dirTree.children.find((v) => {
                if (v.path === targetPath) {
                    rootLeaf = true
                    return true
                } else return targetPath.includes(v.path)
            })
            if (rootLeaf) {
                return dirTree
            }
        }
        if (!dirTree) {
            logger.debug("not exist", targetPath)
            return false
        }

        const branch = targetPath.replace(path.resolve(dirTree.path) + path.sep, "").split(path.sep)
        let leaf = dirTree
        for (let index = 0; index < branch.length; index++) {
            const label = branch[index]
            leaf = leaf.children.find((v) => v.label === label)
            if (!leaf) {
                return false
            }
        }
        return leaf
    } catch (error) {
        // console.log(error);
    }
}

export const treeMerger = (toA: Tree, addB: Tree[] | Tree) => {
    if (addB instanceof Array) {
        for (let index = 0; index < addB.length; index++) {
            const addVal = addB[index]
            treeMerger(toA, addVal)
        }
    } else if (addB instanceof Object) {
        if (Object.keys(toA).length > 0 && toA.label !== addB.label) {
            console.log(toA, addB, "===================")
            return
        }
        const deepChildren = addB.children
        if (toA.children) {
            delete addB.children
        }
        Object.assign(toA, addB)
        if (deepChildren) {
            deepChildren.forEach((val) => {
                if (toA.children instanceof Array) {
                    const exist = toA.children.find((v) => v.label === val.label)
                    if (exist) {
                        return treeMerger(exist, val)
                    } else return toA.children.push(val)
                }
                toA.children = []
                toA.children.push(val)
            })
        }
    } else return new Error("参数错误")
}

export { readDirTree, readDirTreeSync, appedDirTree, searchLeaf }
