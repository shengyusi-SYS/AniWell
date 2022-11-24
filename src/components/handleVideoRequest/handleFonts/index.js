const { readdir, access, mkdir, copyFile } = require('fs/promises');
const path = require('path');
const { extractFonts } = require('../../../utils');
const { settings } = require('../../../utils/init');
const { logger } = require('../../../utils/logger');

var fonts
async function handleFonts(filePath) {
    let dirContent = await readdir(path.dirname(filePath))
    let fontsPath
    for (let index = 0; index < dirContent.length; index++) {
        const name = dirContent[index];
        if (/((\W|_)|^)fonts((\W|_)|$)/gim.test(name)) {
            fontsPath = path.resolve(path.dirname(filePath), name)
        }
    }
    let type
    try {
        var fileList = await readdir(fontsPath)
        type = 'dir'
    } catch (error) {
        type = 'file'
    }
    if (type == 'dir') {
        try {
            try {
                await mkdir(path.resolve(settings.tempPath, 'fonts'))
            } catch (error) { }
            for (let index = 0; index < fileList.length; index++) {
                const file = path.resolve(fontsPath, fileList[index])
                try { await copyFile(file, path.resolve(settings.tempPath, 'fonts', fileList[index])) } catch (error) { }
            }
            fonts = fontsPath
        } catch (error) { logger.error('handleFonts copyFile', error) }
    } else if (type = 'file') {
        if (fonts === fontsPath && fontsPath) {
            try {
                await access(path.resolve(settings.tempPath, 'fonts'))
            } catch (error) {
                return await extractFonts(fontsPath)
            }
        } else {
            fonts = fontsPath
            return await extractFonts(fontsPath)
        }
    }
    return Promise.resolve()
}
module.exports = handleFonts