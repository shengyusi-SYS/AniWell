import Store from 'electron-store'
import paths from '@s/utils/envPath'
import path from 'path'
import { readFile } from 'fs/promises'

type scraperName = string
export interface Ilibrary {
    [libraryName: string]: {
        metadata: {
            [uuid: string]: FileMetadata
        }
        dendriticData: Tree
        map: {
            [key: string]: scraperName
        }
    }
}

export interface FileMetadata {
    fileInfo: {
        uuid: string
        path: string
        size: number
        result: 'item'
        atime: Date //访问
        mtime: Date //修改文件
        ctime: Date //修改状态
        birthtime: Date //创建
    }
    mediaInfo: {
        [scraperName: scraperName]: ScraperResult
    }
    usersInfo: {
        [key: string]: string
    }
}

export interface ScraperResult {
    title: string
    poster: string
    [key: string]: unknown
}

export interface Tree {
    label: string
    result?: 'season' | 'collection'
    [key: string]: unknown
    children: Array<Tree>
}

const store = new Store({
    name: 'library',
    cwd: paths.data,
    defaults: {},
})

class Library {
    public store = store
    constructor() {}
    /**
     * add
     */
    public add(key: string, val: string) {
        this.store.set(key, val)
        return this
    }
    /**
     * addFileMetadata
     */
    public addFileMetadata(libraryName: string, { fileInfo, mediaInfo, usersInfo }: FileMetadata) {
        if (!libraryName) {
            throw new Error('need libraryName')
        }
        if (!fileInfo.uuid) {
            throw new Error('need uuid')
        }
        this.store.set(`${libraryName}.metadata.${fileInfo.uuid}`, {
            fileInfo,
            mediaInfo,
            usersInfo,
        })
        return this
    }
    /**
     * get
     */
    public async get(key: string) {
        return this.store.get(key)
    }
    /**
     * get
     */
    public async getFileMetadata(
        libraryName: string,
        uuid: string,
    ): Promise<FileMetadata | undefined> {
        return this.store.get(`${libraryName}.metadata.${uuid}`) as FileMetadata | undefined
    }
    /**
     * remove
     */
    public remove(id) {
        return this.store.delete(id)
    }
    /**
     * clear
     */
    public clear() {
        return this.store.clear()
    }
}
export default new Library()
