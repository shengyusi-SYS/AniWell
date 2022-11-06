const { promisify } = require('util');
const fs = require('fs');
const rimraf = require('rimraf');

module.exports = {
    readdir: promisify(fs.readdir),
    rmdir: promisify(fs.rmdir),
    mkdir: promisify(fs.mkdir),
    stat: promisify(fs.stat),
    readFile: promisify(fs.readFile),
    writeFile: promisify(fs.writeFile),
    rimraf
}