import { logger } from '@s/utils/logger'
import path from 'path'
import VideoTask from './task'
import { ClientParams } from '@s/api/v1/library/handler/video'

class VideoTaskCenter {
    public taskQueue: Array<VideoTask>
    constructor() {
        this.taskQueue = []
    }
    /**
     * addTask
     */
    public async addTask(params: ClientParams) {
        const task = new VideoTask()
        await task.init(params)
        this.taskQueue.push(task)
        return task
    }
    /**
     * singleTask
     */
    public async singleTask(params: ClientParams) {
        await this.stopAllTask()
        const task = await this.addTask(params)
        return task
    }
    /**
     * stopSingleTask
     */
    public async stopSingleTask(taskId: string) {
        const taskIndex = this.taskQueue.findIndex((v) => v.taskId === taskId)
        const targetTask = this.taskQueue[taskIndex]
        this.taskQueue.splice(taskIndex, 1)
        await targetTask.stop()
    }
    /**
     * stopAllTask
     */
    public async stopAllTask() {
        const cleanQueue = []
        for (let index = 0; index < this.taskQueue.length; index++) {
            const targetTask = this.taskQueue[index]
            cleanQueue.push(targetTask.stop())
        }
        await Promise.all(cleanQueue)
    }
    /**
     * handleRequest
     */
    public async handleRequest(req, res) {
        const reg =
            /^\/(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\..+/
        const taskId = req.path.match(reg)?.groups?.uuid
        const targetTask = this.taskQueue.find((v) => v.taskId === taskId)
        if (targetTask) {
            await targetTask.handleRequest(req, res)
            return
        }
        res.status(500).json({ message: '任务不存在' })
    }
}

export default new VideoTaskCenter()
