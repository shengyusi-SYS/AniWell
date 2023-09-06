import { readFile } from 'fs/promises'
import { inputOptions, outputOptions } from '../rollup.config.js'
import { rollup } from 'rollup'
import chalk from 'chalk'

export default async function build(debug = false) {
	// 创建一个 bundle
	const bundle = await rollup(inputOptions)

	if (debug) {
		console.log(bundle.watchFiles, await readFile('./src/worker.ts', 'utf8')) // 该 bundle 依赖的文件名数组

		// 在内存中生成输出特定的代码
		// 您可以在同一个 bundle 对象上多次调用此函数
		const { output } = await bundle.generate(outputOptions)

		for (const chunkOrAsset of output) {
			if (chunkOrAsset.type === 'asset') {
				console.log('Asset', chunkOrAsset)
			} else {
				if (chunkOrAsset.fileName === 'worker.js') {
					console.log('Chunk', chunkOrAsset.fileName, chunkOrAsset.code)
				}
			}
		}
	}
	await bundle.write(outputOptions)
	console.log(chalk.green('built'))
}

await build()
