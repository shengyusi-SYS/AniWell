/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly MAIN_VITE_REMOTE: string
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
