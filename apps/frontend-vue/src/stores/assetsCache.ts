import { setItem, getItem, createInstance } from 'localforage'

export default createInstance({ name: 'AniWell', storeName: 'assets' })
