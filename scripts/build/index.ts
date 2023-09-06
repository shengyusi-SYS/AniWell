import { matchApps, startApps } from '../utils'

const apps = await matchApps()
await startApps(apps, 'build:all')

export default undefined
