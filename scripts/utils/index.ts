// @ts-check
import fs, { readdirSync, statSync } from 'fs'
import chalk from 'chalk'
import { resolve } from 'node:path'
import { ChildProcess, exec } from 'node:child_process'
import type { Socket } from 'net'
import { readJson } from '../../utils'
import { join } from 'path'
import NamedPipe from 'named-pipe'
import EasyEvents from 'easy-events'

export type appType = 'launcher' | 'frontend' | 'backend'
type appInfo = {
    name: string
    pkgName: string
    version: string
    dir: string
}
export type apps = { [key in appType]: appInfo[] }
export async function matchApps(): Promise<apps> {
    // console.log(__dirname, __filename, resolve('.'), process.cwd())
    const apps: apps = {
        launcher: [],
        frontend: [],
        backend: [],
    }

    const appsDir = resolve('./apps')
    const appNames = readdirSync(appsDir).filter(
        (name) => !name.includes('.local') && statSync(join(appsDir, name)).isDirectory(),
    )

    for (const appName of appNames) {
        const appType = appName.split('-')[0] as appType
        const appDir = join(appsDir, appName)
        const appPkg = readJson(join(appDir, 'package.json'))
        if (apps[appType] instanceof Array) {
            apps[appType].push({
                name: appName,
                pkgName: appPkg.name,
                version: appPkg.version,
                dir: appDir,
            })
        }
    }

    return apps
}

type devInfo = appInfo & {
    process: ChildProcess
    ipcSocket: Socket | undefined
    completed: boolean
}
type buildInfo = appInfo & {
    process: ChildProcess
    completed: boolean
}

export type devProcesses = { [key in appType]: devInfo[] }
export type viteMode = 'dev:all' | 'build:all'
export async function startApps(apps: apps, mode: viteMode): Promise<devProcesses> {
    return new Promise<devProcesses>(async (resolve, reject) => {
        const devProcesses: devProcesses = {
            launcher: [],
            frontend: apps.frontend.map((v) => ({
                ...v,
                process: startProcess(v, mode),
                ipcSocket: undefined,
                completed: false,
            })),
            backend: apps.backend.map((v) => ({
                ...v,
                process: startProcess(v, mode),
                ipcSocket: undefined,
                completed: false,
            })),
        }

        function getTarget(name: string) {
            const appType = name.split('-')[0] as appType
            const target = devProcesses[appType]?.find((v) => v.name === name || v.pkgName === name)
            return target
        }

        const info = {
            frontendUrl: undefined,
        }

        let checked = false
        const server = new NamedPipe().serve((socket) => {
            const appDev = new EasyEvents(socket, {
                setReady({ name, complete }) {
                    console.log(chalk.green('ready ----- ' + name))

                    const target = getTarget(name)
                    if (target) {
                        target.ipcSocket = socket
                        target.completed = Boolean(complete)
                    } else return

                    console.log(
                        Object.values(devProcesses)
                            .flat()
                            .map((v) => ({
                                name: v.name,
                                socket: Boolean(v.ipcSocket),
                                complete: v.completed,
                            })),
                    )

                    if (!checked && checkState(['backend', 'frontend'], 'dev')) {
                        devProcesses.launcher = apps.launcher.map((v) => ({
                            ...v,
                            process: startProcess(v, mode),
                            ipcSocket: undefined,
                            completed: false,
                        }))
                        checked = true
                    }

                    if (
                        checkState(['backend', 'frontend', 'launcher'], 'build') ||
                        (checkState(['backend', 'frontend', 'launcher'], 'dev') &&
                            mode === 'dev:all')
                    )
                        resolve(devProcesses)
                },
                setInfo({ key, value }) {
                    info[key] = value
                },
                getFrontendUrl: function () {
                    this.result('getFrontendUrl', { url: info.frontendUrl })
                },
            })
        })

        function startProcess(appInfo: appInfo, mode: viteMode): ChildProcess {
            const { name, dir } = appInfo
            const devProcess = exec('npm run ' + mode, { cwd: dir })
            devProcess.stdout?.pipe(process.stderr)
            return devProcess
        }

        function checkState(targets: appType[], mode: 'dev' | 'build'): boolean {
            let results: boolean[] = []
            if (mode === 'dev') {
                for (const appType of targets) {
                    results = results.concat(devProcesses[appType].map((v) => Boolean(v.ipcSocket)))
                }
            } else {
                for (const appType of targets) {
                    results = results.concat(devProcesses[appType].map((v) => Boolean(v.completed)))
                }
            }

            return !results.includes(false)
        }
    })
}
