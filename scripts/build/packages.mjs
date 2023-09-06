import { exec } from 'child_process'
import { readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

async function buildPackages() {
	const pkgsDir = resolve('./packages')
	const pkgNames = readdirSync(pkgsDir).filter((name) => !name.includes('.local')).filter(name=>statSync(join(pkgsDir,name)).isDirectory())
	try {
		await Promise.all(
			pkgNames.map((name) => {
				try {
					const cwd = join(pkgsDir, name)
					const ex = exec('npm run build', { cwd })
					ex.stdout.pipe(process.stdout)
					ex.stderr.pipe(process.stderr)
					return ex	
				} catch (error) {
					console.log(name+'error : ',error);
				}
			}),
		)
	} catch (error) {
		console.log('buildPackages error:',error);
	}
}

await buildPackages()
