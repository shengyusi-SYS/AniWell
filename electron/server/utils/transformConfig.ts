interface ComplexCell {
    [key: string]: unknown
    type: string
    name: string
    value?: string | number | boolean
    radios?: object
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
                if (element.type === 'cellGroup') {
                    output[element.name] = this.c2s(element.cells, {})
                } else {
                    output[element.name] = element.value
                }
            }
        } else {
            for (const key in input) {
                if (Object.prototype.hasOwnProperty.call(input, key)) {
                    const element = input[key]
                    if (element.type === 'cellGroup') {
                        output[element.name] = this.c2s(element.cells, {})
                    } else {
                        output[element.name] = element.value
                    }
                }
            }
        }
        return output
    }
    s2c(input: Simple, output: Complex | ComplexCell[] = this.complex) {
        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                const value = input[key]
                if (typeof value === 'object') {
                    if (output instanceof Array) {
                        this.s2c(value, output.find((v) => v.name === key).cells)
                    } else {
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
