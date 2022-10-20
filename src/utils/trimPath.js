
const treeMerger = require('./mergerForTree');
const trimPath = (list) => {
    let res = []
    let branches = []
    list.forEach((listVal) => {
        let path = listVal.name.split('/')
        let leaves = []
        path.forEach((pathVal, ind, arr) => {
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