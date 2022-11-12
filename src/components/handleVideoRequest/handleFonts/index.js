const { readdir } = require('fs/promises');
const path = require('path');
const {extractFonts} = require('../../../utils');
async function handleFonts(filePath){
    let dirContent = await readdir(path.dirname(filePath))
    let fonts 
    try {
        dirContent.forEach(name => {
            if (/((\W|_)fonts(\W|_))|(^fonts(\W|_))/gim.test(name)) {
                fonts = path.resolve(path.dirname(filePath),name)
                throw new Error('')
            }
        }); 
    } catch (error) {}
    return await extractFonts(fonts)
}
module.exports = handleFonts