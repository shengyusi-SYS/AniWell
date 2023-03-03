import { Ilibrary } from '@s/store/library'
import { access } from 'fs/promises'
import { resolve } from 'path'
export default async function (library: Ilibrary['']) {
    const flatDir = library.flatDir
    const posterNameList = ['folder.jpg', 'poster.jpg']
    for (const dirPath in flatDir) {
        const box = flatDir[dirPath]
        const posterPathList = posterNameList.map((posterName) => resolve(dirPath, posterName))
        for (let index = 0; index < posterPathList.length; index++) {
            const posterPath = posterPathList[index]
            try {
                await access(posterPath)
                box.poster = posterPath
            } catch (error) {}
        }
    }
}
