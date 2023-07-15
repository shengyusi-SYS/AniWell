interface ComplexCell {
    [key: string]: unknown
    type: string
    name: string
    value?: string | number | boolean
    radios?: object
    private?: boolean
    cells?: ComplexCell[]
}
export interface Complex {
    [key: string]: ComplexCell
}
export interface Simple {
    [key: string]: Simple | string | number | boolean
}

export class TransformConfig {
    public complex: Complex
    public simple: Simple = {}
    constructor(complex: Complex) {
        this.complex = complex
        this.c2s(this.complex)
    }
    c2s(input: Complex | ComplexCell[], output: Simple = this.simple) {
        if (input instanceof Array) {
            for (let index = 0; index < input.length; index++) {
                const element = input[index]
                if (element.type === "cellGroup") {
                    output[element.name] = this.c2s(element.cells, {})
                } else {
                    output[element.name] = element.value
                }
            }
        } else {
            for (const key in input) {
                if (Object.prototype.hasOwnProperty.call(input, key)) {
                    const element = input[key]
                    if (element.type === "cellGroup") {
                        output[element.name] = this.c2s(element.cells, {})
                    } else {
                        output[element.name] = element.value
                    }
                }
            }
        }
        return output
    }
    s2c(
        input: Simple,
        output: Complex | ComplexCell["cells"] = this.complex,
        template?: ComplexCell,
    ) {
        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                const value = input[key]
                if (typeof value === "object") {
                    //Simple类型的每一层代表Complex类型中的一个cellGroup
                    if (output instanceof Array) {
                        //output为ComplexCell[],递归时使用
                        const exist = output.find((v) => v.name === key) //处理差异
                        if (exist) {
                            this.s2c(value, output.find((v) => v.name === key).cells)
                        } else {
                            if (!template) {
                                template = JSON.parse(JSON.stringify(output[0]))
                            }
                            template.name = key
                            output.push(template)
                            this.s2c(value, template.cells)
                        }
                    } else {
                        //output为Complex，最外层使用
                        this.s2c(value, output[key].cells)
                    }
                } else {
                    if (output instanceof Array) {
                        output.find((v) => v.name === key).value = value
                    } else {
                        output[key].value = value
                    }
                }
            }
        }
        return output
    }
}
