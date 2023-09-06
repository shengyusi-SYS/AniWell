import EventEmitter from 'events'

class ScraperEvents {
    event = new EventEmitter()
    emitProgress(progress) {
        this.event.emit('progress', progress)
    }
    onProgress(cb: (progress) => void) {
        this.event.on('progress', cb)
    }
}

export const scraperEvents = new ScraperEvents()
