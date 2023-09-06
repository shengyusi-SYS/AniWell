import { defineConfig } from 'vite'
import keypress from 'keypress'
import treeKill from 'tree-kill'
import { Plugin } from 'vite'
import chalk from 'chalk'

function noticePlugin(): Plugin {
    return {
        name: 'notice-plugin',
        async configureServer(server) {
            console.log(chalk.blue('press ctrl+x to stop childprocesses'))
        },
    }
}
keypress(process.stdin)
process.stdin.on('keypress', function (ch, key) {
    console.log('got "keypress"', key)
    if (key && key.ctrl && (key.name == 'x' || key.name == 'c')) {
        if (key.name == 'c') console.log(chalk.blue('press ctrl+x to stop childprocesses'))
        process.stdin.pause()
        treeKill(process.pid, 'SIGINT', () => {})
    }
})
export default defineConfig(async ({ command, mode, ssrBuild }) => {
    if (mode === 'development') {
        await import('./scripts/dev')
        return {
            plugins: [noticePlugin()],
        }
    } else if (mode === 'production') {
        await import('./scripts/build')
        console.log(chalk.green('build completed , exit now'))
        treeKill(process.pid)
        return {
            plugins: [noticePlugin()],
        }
    }
})
