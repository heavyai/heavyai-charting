import { expect } from "chai"
import * as dc from "../index"
import { SPINNER_DELAY } from "../constants/dc-constants"

describe("Spinner Mixin", () => {
  let chart
  let anchor
  beforeEach(() => {
    chart = dc.spinnerMixin(dc.asyncMixin(dc.baseMixin({})))
    anchor = window.document.createElement("DIV")
    chart.anchor(anchor)
  })

  it("default spinner delay should be the SPINNER_DELAY", () => {
    expect(chart.spinnerDelay()).to.equal(SPINNER_DELAY)
  })

  it("should be able to set the spinner delay", () => {
    chart.spinnerDelay(100)
    expect(chart.spinnerDelay()).to.equal(100)
  })

  it("should wait the minimum spinner delay before adding the overlay", done => {
    chart.spinnerDelay(10)
    chart._invokeDataFetchListener()

    expect(chart.anchor().className.includes("chart-loading-overlay")).to.equal(
      false
    )

    setTimeout(() => {
      expect(
        chart.anchor().className.includes("chart-loading-overlay")
      ).to.equal(true)
      expect(
        chart.anchor().childNodes[0].className.includes("loading-widget-dc")
      ).to.equal(true)
      done()
    }, chart.spinnerDelay() + 5)
  })

  it("should debounce the dataFetch and only add one spinner", done => {
    chart.spinnerDelay(10)
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()
    chart._invokeDataFetchListener()

    expect(chart.anchor().className.includes("chart-loading-overlay")).to.equal(
      false
    )

    setTimeout(() => {
      expect(
        chart.anchor().className.includes("chart-loading-overlay")
      ).to.equal(true)
      expect(chart.anchor().childNodes.length).to.equal(1)
      done()
    }, chart.spinnerDelay() + 5)
  })

  it("should remove spinner once postRedraw is called", done => {
    chart.spinnerDelay(10)
    chart._invokeDataFetchListener()
    expect(chart.anchor().className.includes("chart-loading-overlay")).to.equal(
      false
    )

    setTimeout(() => {
      expect(
        chart.anchor().className.includes("chart-loading-overlay")
      ).to.equal(true)
      chart._activateRenderlets("postRedraw")
      expect(
        chart.anchor().className.includes("chart-loading-overlay")
      ).to.equal(false)
      expect(chart.anchor().childNodes.length).to.equal(0)
      done()
    }, chart.spinnerDelay() + 5)
  })

  it("can override the dataFetch request and success callback", done => {
    let cbVariable = null

    const callbackRequest = () => (cbVariable = "request")
    const callbackSuccess = () => (cbVariable = "success")

    chart.spinnerDelay(10)

    chart.dataFetchRequestCallback(callbackRequest)
    chart.dataFetchSuccessfulCallback(callbackSuccess)

    expect(chart.dataFetchRequestCallback()).to.equal(callbackRequest)
    expect(chart.dataFetchSuccessfulCallback()).to.equal(callbackSuccess)

    chart._invokeDataFetchListener()

    expect(cbVariable).to.equal(null)

    setTimeout(() => {
      expect(cbVariable).to.equal("request")
      chart._activateRenderlets("postRedraw")
      expect(cbVariable).to.equal("success")
      done()
    }, chart.spinnerDelay() + 5)
  })
})
