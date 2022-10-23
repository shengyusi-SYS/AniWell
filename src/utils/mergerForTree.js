const treeMerger = (addA, toB) => {
    addA.forEach(addVal => {
        if (!addVal.children) {
            let exist = toB.find(val => val.label == addVal.label)
            if (!exist) {
                toB.push(addVal)
            }else Object.assign(exist,addVal)
        } else {
            let exist = toB.find(val => val.label == addVal.label)
            if (!exist) {
                toB.push({
                    label: addVal.label,
                    children: []
                })
                treeMerger(addVal.children, toB.find(val => val.label == addVal.label).children)
            }else{
                treeMerger(addVal.children, exist.children)
            }
        }
    })
    return toB
}
module.exports = treeMerger