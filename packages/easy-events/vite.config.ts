import { defineConfig, mergeConfig } from 'vite'
import templateConfig from '../../template/vite/config'
export default mergeConfig(templateConfig({ nodeApp: false }), defineConfig({}))
