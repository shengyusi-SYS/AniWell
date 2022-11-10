const { promisify } = require('util');
const fs = require('fs');
const rimraf = require('rimraf');
const {EventEmitter} = require('events');
const  path  = require('path');
const event = new EventEmitter();

function cleanNull(arr) {
    let temp = []
    arr.forEach(v => {
        if (v.length > 0||typeof v == 'function') {
            temp.push(v)
        }
    })
    return temp
}

function generatePictureUrl(path) {
    return `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
}

function mediaContentType(name) {
    const type = {
        '.mp4':'video/mp4',
        '.mkv':'video/mp4',
        // '.mkv':'video/x-matroska'
      }
      return type[path.extname(name)]
}
module.exports = {
    readdir: promisify(fs.readdir),
    rmdir: promisify(fs.rmdir),
    mkdir: promisify(fs.mkdir),
    stat: promisify(fs.stat),
    readFile: promisify(fs.readFile),
    writeFile: promisify(fs.writeFile),
    access:promisify(fs.access),
    cleanNull,
    generatePictureUrl,
    mediaContentType,
    event,
    rimraf,
}