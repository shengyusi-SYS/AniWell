import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'
import express from 'express'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    build: {
        outDir: 'out',
        target: 'esnext',
    },
    plugins: [
        vue(),
        federation({
            name: 'template-forntend-plugin',
            filename: 'remotePlugin.js',
            exposes: {
                App: './src/App.vue',
            },
            shared: ['vue'],
        }),
        {
            name: 'serve',
            apply(config, env) {
                return false
            },
            configResolved() {
                const app = express()
                app.use((req, res, next) => {
                    res.header('Access-Control-Allow-Origin', '*')
                    next()
                })
                app.use(express.static('./out'))
                app.listen(3333, () => {
                    console.log('listening http://localhost:3333')
                })
            },
        },
    ],
})
