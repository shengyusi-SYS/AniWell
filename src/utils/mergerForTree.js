const treeMerger = (addA, toB) => {
    addA.forEach(addVal => {
        if (!addVal.children) {
            toB.push(addVal)
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