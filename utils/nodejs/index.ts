import { dirname, isAbsolute, join, resolve, sep } from 'path'
import { access, cp, link, symlink } from 'fs/promises'
import {
    accessSync,
    copyFileSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    statSync,
} from 'fs'
import { minimatch } from 'minimatch'

export function readJson(path: string): { [key: string]: any } {
    return JSON.parse(readFileSync(path).toString())
}

export async function deepCopy(
    sourcePath: string,
    newPath: string,
    config: { filter?: (sourcePath: string, newPath: string) => Promise<boolean> | boolean } = {},
    madeDir: string[] = [],
): Promise<unknown> {
    const { filter } = config
    if (filter && (await filter(sourcePath.trim(), newPath.trim())) === false) return

    try {
        await cp(sourcePath, newPath, {
            recursive: true,
            filter: async (source, destination) => {
                if (filter)
                    return await filter(
                        source.replace('\\\\?\\', ''),
                        destination.replace('\\\\?\\', ''),
                    )
                else return true
            },
        })
        return
    } catch (error) {}

    const sourceStat = statSync(sourcePath)
    try {
        if (!madeDir.includes(dirname(newPath))) {
            await access(dirname(newPath)).catch(() => mkdirSync(dirname(newPath)))
            madeDir.push(dirname(newPath))
        }
    } catch (error) {}

    if (sourceStat.isFile()) {
        copyFileSync(sourcePath, newPath)
        return
    } else if (sourceStat.isSymbolicLink()) {
        const realPath = readlinkSync(sourcePath)
        return deepCopy(realPath, newPath, config, madeDir)
    } else if (sourceStat.isDirectory()) {
        const sources = readdirSync(sourcePath)
        return await Promise.all(
            sources.map((sourceName) =>
                deepCopy(join(sourcePath, sourceName), join(newPath, sourceName), config, madeDir),
            ),
        )
    } else return
}
export function searchModule(name: string): string | void {
    const chain = resolve('./')
        .split(sep)
        .map((v, i, a) => {
            let dir = a[0]
            for (let ind = 1; ind <= i; ind++) {
                dir = join(dir, a[ind])
            }
            return dir
        })
        .reverse()

    for (let i = 0; i < chain.length; i++) {
        const current = join(chain[i], './node_modules', name)
        try {
            const currentStat = statSync(current)
            if (currentStat.isSymbolicLink()) return readlinkSync(current)
            if (currentStat.isDirectory()) return current
            return
        } catch (error) {}
    }
}

export function deepSearchDeps(name: string, cache: string[] = []): string[] {
    const modulePath = searchModule(name)

    if (!modulePath) return []
    const modulePkgPath = join(modulePath, 'package.json')
    let modulePkg
    try {
        modulePkg = readJson(modulePkgPath)
    } catch (error) {
        return []
    }
    const subDepNames = Object.keys(modulePkg.dependencies || {})
    return cache
        .concat(subDepNames)
        .concat(subDepNames.flatMap((name) => deepSearchDeps(name, cache)))
}

export async function copyModule(modulePath: string, newPath: string) {
    const modulePkg = readJson(join(modulePath, 'package.json'))

    const regs = modulePkg.files
    if (regs instanceof Array) {
        if (regs.includes('*')) {
            return deepCopy(modulePath, newPath, {
                filter(sourcePath, newPath) {
                    if (sourcePath.includes('.local')) return false
                    if (sourcePath === modulePath) return true
                    else return true
                },
            })
        } else {
            return deepCopy(modulePath, newPath, {
                filter(sourcePath, newPath) {
                    if (sourcePath.includes('.local')) return false
                    if (sourcePath === modulePath) return true
                    if (sourcePath.trim().endsWith('package.json')) return true
                    if (sourcePath.includes(join(modulePath, 'node_modules'))) return true
                    for (const reg of regs) {
                        try {
                            if (new RegExp(reg, 'g').test(sourcePath)) return true
                        } catch (error) {
                            if (minimatch(sourcePath, reg)) return true
                        }
                    }
                    return false
                },
            })
        }
    } /* if (modulePkg.main) {
        const entryDir = dirname(join(modulePath, modulePkg.main))
        return deepCopy(modulePath, newPath, {
            filter(sourcePath, newPath) {
                if (sourcePath.includes('.local')) return false
                if (sourcePath === modulePath) return true
                if (sourcePath.trim().endsWith('package.json')) return true
                if (sourcePath.includes(join(modulePath, 'node_modules'))) return true
                if (entryDir.includes(sourcePath) || sourcePath.includes(entryDir)) return true
                return false
            },
        })
    } else */ else return deepCopy(modulePath, newPath)
}
