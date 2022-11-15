const {vidoeHash} = require('../../../utils')
const {readdir} = require('fs/promises');
const {scrapeLogger} = require('../../../utils/logger');

const path = require('path');
async function dandanplayMatch(filePath) {
    let fileName = path.parse(filePath).name
    let hash = await vidoeHash(filePath)
    const headers = [
        ['Content-Type', 'application/json'],
      ];
    let form = {
        fileName:encodeURIComponent(fileName),
        fileHash:hash,
        matchMode:'hashAndFileName',
    }
    console.log(form);
    let res = await fetch('https://api.dandanplay.net/api/v2/match',{headers,method:'post',body:JSON.stringify(form)})
    res = await res.json()
    if (res.errorCode!=0) {
        scrapeLogger.error('dandanplayMatch res err',res.errorMessage)
    }
    res =  res.success?{
        hash,
        fileName,
        accurate:res.isMatched,
        matches:res.matches
    }:false
    scrapeLogger.info('dandanplayMatch res',res);
    return res
}

module.exports = dandanplayMatch