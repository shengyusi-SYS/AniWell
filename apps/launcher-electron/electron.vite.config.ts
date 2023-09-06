import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import federation from '@originjs/vite-plugin-federation'
import appReady, { manualReady } from 'vite-plugin-dev-app-ready'
import { external } from '../../template/vite/config'

const devAll = Boolean(process.env['DEVALL'])
const buildAll = Boolean(process.env['BUILDALL'])
const state = {
    main: false,
    preload: false,
    renderer: false,
}
const readyPlugin = (part: keyof typeof state) => {
    return {
        name: 'ready',
        closeBundle() {
            state[part] = true
            if ((devAll || buildAll) && !Object.values(state).includes(false))
                manualReady('launcher-electron', 'complete')
        },
    }
}

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin({ exclude: external }), readyPlugin('main')],
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id: string) {
                        for (const pkgName of external) {
                            if (id.includes('/node_modules/' + pkgName)) {
                                return pkgName
                            }
                        }
                    },
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin(), readyPlugin('preload')],
    },
    renderer: {
        resolve: {
            alias: {
                '@r': resolve('src/renderer/src'),
            },
        },
        plugins: [
            vue(),
            federation({
                name: 'fake',
                remotes: {},
                shared: ['vue'],
            }),
            readyPlugin('renderer'),
        ],
        css: {
            postcss: {
                plugins: [tailwindcss, autoprefixer],
            },
        },
    },
})
