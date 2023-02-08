import getVideoInfo from './getVideoInfo'

export interface IVideoTask {
    taskId: number
    init: () => Promise<void>
    stop: () => Promise<void>
}
export default class VideoTask implements VideoTask {
    private videoInfo
    private subtitleList
    private handler
    private process
    public contentType
    public method
    public taskId
    constructor() {}
    /**
     * init
     */
    public async init(params) {
        const { filePath, bitrate, autoBitrate, resolution, SID, method } = params //测试，待删
        this.videoInfo = await getVideoInfo(filePath)
        this.subtitleList = await handleSubtitles(filePath, this.videoInfo)
        this.videoInfo = selectMethod(this.videoInfo, params)
        if (method === 'direct') this.videoInfo.method = 'direct' //测试，待删

        if (this.videoInfo.method == 'direct') {
        } else if (this.videoInfo.method == 'transcode') {
            await handleFonts(filePath)
        }
        this.contentType = 'application/x-mpegURL'

        this.method = this.videoInfo.method
        this.taskId = path.basename(filePath)
    }
    /**
     * stop
     */
    public async stop() {}
    /**
     * handleRequest
     */
    public handleRequest(req, res) {}
}
