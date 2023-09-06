import EventEmitter from 'events'
import { v4 as uuidv4 } from 'uuid'

export interface Tree {
	name: string
	children?: Tree[]
}
export interface ProgressTask extends Tree {
	id: string
	state: 'pending' | 'fulfilled' | 'rejected'
	info?: string
	total?: number
	current?: number
	children?: ProgressTask[]
}
export interface SubProgress extends ProgressTask {
	parentId?: string
}

export default class Progress {
	task: ProgressTask
	map: Map<string, ProgressTask> = new Map()
	event = new EventEmitter()

	constructor(
		name: string,
		{ total = 0, onUpdate }: { total?: number; onUpdate?: (subProgress: SubProgress) => void },
	) {
		this.task = {
			name,
			id: uuidv4(),
			state: 'pending',
			info: 'init',
			total,
			children: [],
		}
		if (onUpdate) this.event.on('update', onUpdate)
	}

	getProcess = (id: string = '') => {
		return id === '' ? this.task : this.map.get(id)
	}

	addSubProgress = ({
		name,
		parentId = '',
		info,
		total,
		children,
	}: Pick<SubProgress, Exclude<keyof SubProgress, 'id'>>) => {
		const parent = this.getProcess(parentId)
		if (parent == undefined) throw new Error('parent not found')

		const subProgress: SubProgress = {
			name,
			id: uuidv4(),
			state: 'pending',
			parentId,
			info,
			total,
			children,
		}
		for (const key in subProgress) {
			if (subProgress[key] == undefined) delete subProgress[key]
		}

		if (parent.children == undefined) parent.children = []
		parent.children.push(subProgress)
		this.map.set(subProgress.id, subProgress)

		this.event.emit('update', subProgress)
		return subProgress
	}

	updateProgress = (
		subProgress: Partial<Pick<SubProgress, 'id' | 'info' | 'total' | 'current' | 'state'>>,
	) => {
		const target = this.getProcess(subProgress.id)
		if (target == undefined) throw new Error('parent not found')

		const content = { ...subProgress }
		delete content.id
		Object.assign(target, content)

		this.event.emit('update', subProgress)
		return target
	}

	end = (state: 'fulfilled' | 'rejected' = 'fulfilled') => {
		this.updateProgress({
			state,
		})
	}
}
