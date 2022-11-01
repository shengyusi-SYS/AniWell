
const treeMerger = require('./mergerForTree');
const path = require('path');
const trimPath = (list) => {
    let res = []
    let branches = []
    // console.log(list);
    list.forEach((listVal) => {
        let abs = path.isAbsolute(listVal.name)
        let filePath
        if (abs) {
            filePath = listVal.name.split(path.sep)
        }else filePath = listVal.name.split('/')
        let leaves = []
        filePath.forEach((pathVal, ind, arr) => {
            leaves.push({ label: pathVal })
        })
        leaves.forEach((val, ind, arr) => {
            if (ind < arr.length - 1) {
                val.children = [arr[ind + 1]]
            } else {
                Object.assign(val, listVal)
            }
        })
        branches.push(leaves[0])
    });
    treeMerger(branches, res)
    return res
}
module.exports = trimPath