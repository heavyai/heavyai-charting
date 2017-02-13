import {expect} from "chai"
import * as dc from "../src"

describe("Utils", () => {
  it('should have all the necessary exports', () => {
    expect(typeof dc.printers.filters).to.equal("function")
    expect(typeof dc.printers.filter).to.equal("function")
    expect(typeof dc.pluck).to.equal("function")
    expect(typeof dc.utils.printSingleValue).to.equal("function")
    expect(typeof dc.utils.add).to.equal("function")
    expect(typeof dc.utils.subtract).to.equal("function")
    expect(typeof dc.utils.isNumber).to.equal("function")
    expect(typeof dc.utils.isFloat).to.equal("function")
    expect(typeof dc.utils.isInteger).to.equal("function")
    expect(typeof dc.utils.isNegligible).to.equal("function")
    expect(typeof dc.utils.clamp).to.equal("function")
    expect(typeof dc.utils.uniqueId).to.equal("function")
    expect(typeof dc.utils.nameToId).to.equal("function")
    expect(typeof dc.utils.appendOrSelect).to.equal("function")
    expect(typeof dc.utils.safeNumber).to.equal("function")
    expect(typeof dc.utils.b64toBlob).to.equal("function")
  })
})
