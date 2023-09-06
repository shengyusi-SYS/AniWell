import { accessSync, createWriteStream, mkdirSync, rmSync, statSync } from 'fs'
import { access, stat, writeFile } from 'fs/promises'
import { arch, platform, type } from 'os'
import { basename, dirname, extname, join, normalize, resolve } from 'path'
import { path7za } from '7zip-bin'
import { type StdioOptions, spawn } from 'child_process'
import { fileURLToPath } from 'url'
const pass = (error: Error) => error
const log = (data: any) => console.log

const command = (commands: string[], stdio?: StdioOptions) => {
    return spawn(basename(path7za), commands, {
        shell: true,
        cwd: dirname(path7za),
        stdio,
    })
}
const extract = (input: string, output: string = dirname(input)) => {
    if (['.gz', '.xz'].includes(extname(input))) {
        const tar = command([`x`, input, '-so'])
        tar.on('error', log)
        tar.stderr?.pipe(process.stderr)

        const out = command([`x`, '-ttar', '-si', `-o${output}`, '-y'])
        out.stdin?.on('error', log)
        out.stderr?.pipe(process.stderr)
        out.stdout?.pipe(process.stderr)
        if (out.stdin && out.stdin.writable) {
            tar.stdout?.pipe(out.stdin)
        }

        return out
    }
    return command([`x`, input, `-o${output}`, '-y'])
}

const staticVersion = [
    {
        name: 'Release 5.1.3-4',
        assets: [
            {
                name: 'jellyfin-ffmpeg_5.1.3-4-portable_win64.zip',
                url: 'https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v5.1.3-4/jellyfin-ffmpeg_5.1.3-4-portable_win64.zip',
            },
            {
                name: 'jellyfin-ffmpeg_5.1.3-4_portable_linux64-gpl.tar.xz',
                url: 'https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v5.1.3-4/jellyfin-ffmpeg_5.1.3-4_portable_linux64-gpl.tar.xz',
            },
            {
                name: 'jellyfin-ffmpeg_5.1.3-4_portable_linuxarm64-gpl.tar.xz',
                url: 'https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v5.1.3-4/jellyfin-ffmpeg_5.1.3-4_portable_linuxarm64-gpl.tar.xz',
            },
        ],
    },
]

const platformMap = [
    ['win64', 'linux64', 'linuxarm64'],
    ['win32-x64', 'linux-x64', 'linux-arm64'],
] as const
const platformName = (platform() + '-' + arch()) as (typeof platformMap)[1][number]
const binPaths = {
    //relative to cwd
    win64: './platforms/win32-x64',
    linux64: './platforms/linux-x64',
    linuxarm64: './platforms/linux-arm64',
}
const platformReg = /portable_(?<platform>\w+)/

type versions = {
    name: string
    assets: {
        name: string
        url: string
    }[]
}[]
class FFmpeg {
    version: string
    ffmpegPath: string
    ffproberPath: string
    cwd: string
    constructor({ version, cwd }: { version?: string; cwd?: string } = {}) {
        if (!version) version = '5.1.3'
        this.version = version

        if (!cwd) cwd = fileURLToPath(import.meta.url)
        try {
            const cwdStat = statSync(cwd)
            if (cwd === fileURLToPath(import.meta.url)) {
                cwd = join(dirname(dirname(cwd)), './.local')
            } else if (cwdStat.isFile()) {
                cwd = dirname(cwd)
            } else if (!cwdStat.isDirectory()) {
                throw new Error('FFmpeg work dir error' + cwd)
            }
        } catch (error) {
            try {
                mkdirSync(cwd)
            } catch (error) {
                throw error
            }
        }

        try {
            mkdirSync(join(cwd, 'platforms'))
            mkdirSync(join(cwd, 'platforms', platform() + '-' + arch()))
        } catch (error) {}
        this.cwd = cwd

        this.ffmpegPath = resolve(
            cwd,
            'platforms',
            platform() + '-' + arch(),
            'ffmpeg' + (platform() === 'win32' ? '.exe' : ''),
        )
        this.ffproberPath = resolve(
            cwd,
            'platforms',
            platform() + '-' + arch(),
            'ffprobe' + (platform() === 'win32' ? '.exe' : ''),
        )
    }
    checkFile = () => {
        try {
            accessSync(this.ffmpegPath)
            accessSync(this.ffproberPath)
            return true
        } catch (error) {
            console.log('ffmpeg not exist,please deploy', error)
            return false
        }
    }
    checkRelease = async ({ size = 4, page = 1 }) => {
        if (this.version === '5.1.3') {
            return staticVersion
        }
        const releases = await (
            await fetch(
                `https://api.github.com/repos/jellyfin/jellyfin-ffmpeg/releases?per_page=${size}&page=${page}`,
            )
        ).json()
        const versions: versions = releases.map((v) => {
            return {
                name: v.name,
                assets: v.assets
                    .map((val) => {
                        return {
                            name: val.name,
                            url: val.browser_download_url,
                        }
                    })
                    .filter((val) => {
                        return val.name.includes('portable') && !val.name.includes('sha256sum')
                    }),
            }
        })
        return versions
    }
    upgrade = async (
        targetPlatform: (typeof platformMap)[0][number][] = [
            platformMap[0][platformMap[1].indexOf(platformName)],
        ],
    ) => {
        const { version } = this
        const versions = await this.checkRelease({})
        const targets = versions.filter((v) => v.name.includes(version))[0].assets

        return await Promise.allSettled(
            targets.map(async ({ name, url }) => {
                const pkgPlatform = platformReg.exec(name)?.groups?.platform as
                    | (typeof platformMap)[0][number]
                    | undefined
                if (pkgPlatform == undefined) return
                const pkgPath = resolve(this.cwd, binPaths[pkgPlatform], name)

                if (targetPlatform && !targetPlatform.includes(pkgPlatform)) return

                const exist = await stat(pkgPath).catch(pass)

                const pkgRes = await fetch(url)
                const size = pkgRes.headers.get('content-length')!

                if (!(exist instanceof Error) && size === exist.size.toString()) {
                    return Promise.resolve(pkgPath)
                }

                const pkgWriter = createWriteStream(pkgPath)
                const pkgReader = pkgRes.body?.getReader()

                if (pkgReader == undefined) return

                while (true) {
                    const { done, value } = await pkgReader.read()
                    if (done) {
                        console.log(name, 'Download complete')
                        break
                    }
                    pkgWriter.write(value)
                }

                pkgWriter.end()
                return Promise.resolve(pkgPath)
            }),
        )
    }
    unzip = async (pkgs: string[]) => {
        await Promise.allSettled(
            pkgs.map((pkg) => {
                return new Promise<void>((resolve, reject) => {
                    const ex = extract(pkg)
                    ex.on('error', log)
                    ex.on('exit', (code) => {
                        if (code === 0) {
                            console.log(pkg, 'ok')
                            resolve()
                        } else reject()
                    })
                })
            }),
        )
    }
    deploy = async () => {
        const pkgs = (await this.upgrade())
            .map((v) => {
                if (v.status === 'fulfilled') {
                    return v.value
                } else return undefined
            })
            .filter((v) => v != undefined) as string[]
        await this.unzip(pkgs)
    }
}
export default FFmpeg
