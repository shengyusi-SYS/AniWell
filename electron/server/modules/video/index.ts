import { logger } from '@s/utils/logger'
import path from 'path'
import VideoTask from './task'

class VideoTaskCenter {
    private taskQueue: Array<VideoTask> = []
    constructor() {}
    /**
     * addTask
     */
    public async addTask(params) {
        const task = new VideoTask()
        await task.init(params)
        this.taskQueue.push(task)
    }
    /**
     * singleTask
     */
    public async singleTask(params) {
        await this.stopAllTask()
        await this.addTask(params)
    }
    /**
     * stopSingleTask
     */
    public async stopSingleTask(taskId: string) {
        let taskIndex: number
        const targetTask = this.taskQueue.find((v, i) => {
            if (v.taskId === taskId) {
                taskIndex = i
                return true
            } else return false
        })
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
        const taskId = req.path
        const targetTask = this.taskQueue.find((v) => v.taskId === taskId)
        await targetTask.handleRequest(req, res)
    }
}
