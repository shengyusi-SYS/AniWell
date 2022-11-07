const { promisify } = require('util');
const fs = require('fs');
const rimraf = require('rimraf');
const {EventEmitter} = require('events');
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
module.exports = {
    readdir: promisify(fs.readdir),
    rmdir: promisify(fs.rmdir),
    mkdir: promisify(fs.mkdir),
    stat: promisify(fs.stat),
    readFile: promisify(fs.readFile),
    writeFile: promisify(fs.writeFile),
    rimraf,
    event,
    cleanNull
}