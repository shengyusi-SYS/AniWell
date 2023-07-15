let merger = (a, b) => {
    //先遍历新数据b
    for (const key in b) {
        //如果b[key]不是Object
        if (!(b[key] instanceof Object)) {
            a[key] = b[key]
        } else {
            //如果b[key]是Object则在a中创建同名对象，递归
            if (!a[key]) {
                a[key] = {}
            }
            merger(a[key], b[key])
        }
    }
    return a
}

module.exports = merger
