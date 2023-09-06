import { watch as rollupWatch } from 'rollup'
import { exec } from 'child_process'
import { watch } from 'fs'
import treeKill from 'tree-kill'
import { debounce } from 'lodash-es'
import chalk from 'chalk'
import config from '../rollup.config.js'
import build from './build.js'
process.on('uncaughtException', (err) => {
	console.log(err)
})

const devProcesses = new Map()

const runDev = debounce(async () => {
	const devProcess = exec('node ./dist/main.js')
	const tag = Symbol(devProcess.pid || 0)
	devProcesses.set(tag, devProcess)
	devProcess.stdout?.pipe(process.stderr)
	console.log(chalk.green('run'))
}, 100)

const killDev = debounce(async () => {
	console.log(chalk.yellow('kill'))
	const targets = []
	for (const [tag, devProcess] of devProcesses) {
		targets.push(
			new Promise((resolve, reject) => {
				if (devProcess.pid) treeKill(devProcess.pid, console.log)
				else devProcess.kill('SIGTERM')
				devProcess.once('exit', () => {
					devProcesses.delete(tag)
					resolve()
				})
			}),
		)
	}
	console.log(targets)
	await Promise.allSettled(targets)
	console.log(chalk.yellow('exit'))
}, 100)

const restartDev = debounce(
	async (...args) => {
		if (devProcesses.size > 0) {
			await killDev()
		}
		console.log(chalk.yellow(...args))
		await build(false)
		runDev()
	},
	2000,
	{ leading: true, trailing: true },
)

async function devWatch() {
	console.log(chalk.green('watch'))
	await restartDev()
	watch('./src', restartDev)
}

//  devWatch()

async function rollupWatcher(debug = false) {
	const watchOptions = {
		...config,
		watch: {
			exclude: 'node_modules/**',
			include: 'src/**',
			chokidar: {},
		},
	}
	const watcher = rollupWatch(watchOptions)

	watcher.on('event', async (event) => {
		console.log(chalk.green(event.code))
		if (event.code === 'ERROR') {
			console.log(event)
		}
		if (event.code === 'START') {
			console.log(chalk.green('-------------------------'))
			// await killDev()
		}

		if (event.code === 'BUNDLE_END') {
			if (debug) {
				const { output } = await event.result.generate(outputOptions)
				for (const chunkOrAsset of output) {
					if (chunkOrAsset.type === 'asset') {
						console.log('Asset', chunkOrAsset)
					} else {
						console.log('Chunk', chunkOrAsset.fileName, chunkOrAsset.code)
					}
				}
			}
			await event.result.close()
		}
		if (event.code === 'END') {
			// await runDev()
		}
	})

	watcher.on('change', async (id, change) => {
		console.log(id, change)
	})
	watcher.on('restart', async () => {
		console.log('re')
		// await killDev()
	})
	watcher.on('close', () => {
		console.log('close')
	})
}

rollupWatcher()
