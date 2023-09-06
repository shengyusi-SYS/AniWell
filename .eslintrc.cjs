module.exports = {
	extends: ['eslint:recommended', 'prettier'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint/eslint-plugin'],
	root: true,
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
	},
	rules: {
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
	},
	env: {
		browser: true,
		node: true,
		es2022: true,
		worker: true,
		serviceworker: true,
	},
}
