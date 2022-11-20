const { access, writeFile } = require('fs/promises');
const path = require('path');
const { scrapeLogger } = require('../../../utils/logger');

async function grabResources(dirPath, imageUrl) {
    // console.log(imageUrl);
    const { got } = await import('got')
    let existPoster = false
    let overwrite = false
    if (!overwrite) {
        try {
            await access(path.resolve(dirPath, `folder.jpg`))
            existPoster = true
            return path.resolve(dirPath, `folder.jpg`)
        } catch (error) {
            try {
                await access(path.resolve(dirPath, `poster.jpg`))
                existPoster = true
                return path.resolve(dirPath, `poster.jpg`)
            } catch (error) {
            scrapeLogger.error('grabResources read', error)
            }
        }
    }
    if (overwrite || !existPoster) {
        try {
            let task = await got({
                url: imageUrl,
                method: 'get',
                responseType: "buffer"
            })
            let res = task.body
            await writeFile(path.resolve(dirPath, `folder.jpg`), res)
            scrapeLogger.debug('grabResources', dirPath)
            // console.log('grabResources', dirPath);
            return path.resolve(dirPath, `folder.jpg`)
        } catch (error) {
            scrapeLogger.error('grabResources', error)
            // console.log('grabResources', error);
        }
    }
    return false
}

module.exports = grabResources