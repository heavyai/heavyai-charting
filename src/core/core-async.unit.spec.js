import * as dc from "../index"
import chai, { expect } from "chai"
import spies from "chai-spies"

chai.use(spies)

describe("Core Async", () => {
  before(() => {
    dc.chartRegistry.clear()
  })

  describe("Tracker", () => {
    let tracker = null

    function runner() {
      return Promise.resolve()
    }

    // This fixes an issue in mocha where async tests will simply error with
    // "done() called multiple times" if an expectation fails instead of
    // showing the information about the failed expectation.
    function asyncTestWrapper(tester) {
      return (done) => {
        let hasError = false
        try {
          return tester(val => {
            if (!hasError) {
              done(val)
            }
          })
        } catch (err) {
          hasError = true
          throw err
        }
      }
    }

    beforeEach(() => {
      tracker = new dc.LockTracker(chai.spy())
    })

    describe("_run", () => {
      it("should set and unset the group", asyncTestWrapper((done) => {
        tracker._run("group", false, runner).then(() => {
          expect(Object.keys(tracker.groups)).to.be.empty
          done()
        })
        expect(tracker.groups).to.have.keys("group")
      }))

      it("should set and unset all", asyncTestWrapper((done) => {
        tracker._run(null, true, runner).then(() => {
          expect(tracker.all).to.be.null
          done()
        })
        expect(tracker.all).to.not.be.null
      }))

      it("should set and unset multiple groups", asyncTestWrapper((done) => {
        let finished = 0
        const doneAll = () => {
          if (++finished === 3) {
            done()
          }
        }

        tracker._run("group1", false, runner).then(() => {
          expect(tracker.groups).to.not.have.keys("group1")
          doneAll()
        })
        tracker._run("group2", false, runner).then(() => {
          expect(tracker.groups).to.not.have.keys("group2")
          doneAll()
        })
        tracker._run("group3", false, runner).then(() => {
          expect(tracker.groups).to.not.have.keys("group3")
          doneAll()
        })
        expect(tracker.groups).to.have.keys("group1", "group2", "group3")
      }))
    })

    describe("shouldStart", () => {
      it("should return true when nothing is tracked", () => {
        expect(tracker.shouldStart("group")).to.be.true
        expect(tracker.shouldStart(null, true)).to.be.true
      })

      it("should return false if a group is already tracked", asyncTestWrapper((done) => {
        tracker._run("group", false, runner).then(done)
        expect(tracker.shouldStart("group")).to.be.false
        expect(tracker.shouldStart(null, true)).to.be.false
      }))

      it("should return true even if another group is tracked", asyncTestWrapper((done) => {
        tracker._run("group1", false, runner).then(done)
        expect(tracker.shouldStart("group2")).to.be.true
      }))

      it("should return false if 'all' is tracked", asyncTestWrapper((done) => {
        tracker._run(null, true, runner).then(done)
        expect(tracker.shouldStart("group")).to.be.false
        expect(tracker.shouldStart(null, true)).to.be.false
      }))
    })

    describe("isEmpty", () => {
      it("should return true when nothing is tracked", () => {
        expect(tracker.isEmpty()).to.be.true
        expect(tracker.isEmpty("group")).to.be.true
      })

      it("should return false if a group is tracked", asyncTestWrapper((done) => {
        tracker._run("group", false, runner).then(done)
        expect(tracker.isEmpty()).to.be.false
        expect(tracker.isEmpty("group")).to.be.false
        expect(tracker.isEmpty("group2")).to.be.true
      }))

      it("should return false if all is tracked", asyncTestWrapper((done) => {
        tracker._run(null, true, runner).then(done)
        expect(tracker.isEmpty()).to.be.false
        expect(tracker.isEmpty("group")).to.be.false
        expect(tracker.isEmpty("group2")).to.be.false
      }))
    })

    describe("start", () => {
      it("should start running when nothing is tracked", asyncTestWrapper((done) => {
        const spyRunner = chai.spy(runner)
        tracker.start("group", false, spyRunner).then(() => {
          expect(spyRunner).to.have.been.called.once
          expect(tracker.groups).to.not.have.keys("group")
          done()
        })
        expect(tracker.groups).to.have.keys("group")
      }))

      it("should start running even if a different group is running", asyncTestWrapper((done) => {
        const spyRunner = chai.spy(runner)

        let finished = 0
        const doneAll = () => {
          if (++finished === 2) {
            expect(spyRunner).to.have.been.called.twice
            expect(tracker.groups).to.not.have.keys("group1", "group2")
            done()
          }
        }

        tracker.start("group1", false, spyRunner).then(doneAll)
        tracker.start("group2", false, spyRunner).then(doneAll)
        expect(tracker.groups).to.have.keys("group1", "group2")
      }))

      it("should start running a group after all has completed", asyncTestWrapper((done) => {
        const spyRunner = chai.spy(runner)
        const runner2 = () => {
          expect(spyRunner).to.have.been.called.once
          expect(tracker.all).to.be.null
          return runner().then(() => {
            expect(tracker.groups).to.have.keys("group")
          })
        }

        tracker.start(null, true, spyRunner)
        tracker.start("group", false, runner2).then(() => {
          expect(tracker.groups).to.not.have.keys("group")
          done()
        })
        expect(tracker.all).to.not.be.null
        expect(tracker.pendingGroups).to.have.keys("group")
      }))

      it("should start running all after all groups complete", asyncTestWrapper((done) => {
        const spyRunner = chai.spy(runner)
        const runner2 = () => {
          expect(spyRunner).to.have.been.called.twice
          expect(Object.keys(tracker.groups)).to.be.empty
          expect(tracker.pendingAll).to.be.null
          return runner().then(() => {
            expect(tracker.all).to.not.be.null
          })
        }

        tracker.start("group1", false, spyRunner)
        tracker.start("group2", false, spyRunner)
        tracker.start(null, true, runner2).then(() => {
          expect(tracker.all).to.be.null
          done()
        })
        expect(tracker.all).to.be.null
        expect(tracker.pendingAll).to.not.be.null
        expect(tracker.groups).to.have.keys("group1", "group2")
      }))

      it("should start running a group after the previous run completes", asyncTestWrapper((done) => {
        const spyRunner = chai.spy(runner)
        const runner2 = () => {
          expect(spyRunner).to.have.been.called.once
          expect(tracker.groups).to.not.have.keys("group")
          expect(tracker.pendingGroups).to.not.have.keys("group")
          return runner().then(() => {
            expect(tracker.groups).to.have.keys("group")
          })
        }

        tracker.start("group", false, spyRunner)
        tracker.start("group", false, runner2).then(() => {
          expect(tracker.groups).to.not.have.keys("group")
          done()
        })
        expect(tracker.groups).to.have.keys("group")
        expect(tracker.pendingGroups).to.have.keys("group")
      }))

      it("should only run pending processes once no matter how many times queued", asyncTestWrapper(done => {
        const spyRunner = chai.spy(runner)
        const finished = () => {
          // this should only be called once... if not, we'll get a "done()
          // called multiple times" error
          expect(spyRunner).to.be.called.once
          expect(tracker.groups).to.not.have.keys("group")
          expect(tracker.pendingGroups).to.not.have.keys("group")
          done()
        }

        tracker.start("group", false, runner)

        const promise1 = tracker.start("group", false, spyRunner)
        const promise2 = tracker.start("group", false, spyRunner)
        expect(tracker.groups).to.have.keys("group")
        expect(tracker.pendingGroups).to.have.keys("group")
        expect(promise1).to.equal(promise2)

        promise2.then(finished)
      }))

      it("should run a pending process even if the running process fails", asyncTestWrapper(done => {
        // if this test times out, it's probably because verifyCatch is not
        // getting run correctly.
        let finished = 0
        const spyRunner = chai.spy(() => Promise.reject('error'))
        const verifyCatch = err => {
          expect(err).to.eql("error")
          doneAll()
        }
        const doneAll = () => {
          if (++finished === 2) {
            expect(spyRunner).to.be.called.once
            expect(tracker.groups).to.not.have.keys("group")
            expect(tracker.pendingGroups).to.not.have.keys("group")
            done()
          }
        }

        tracker.start("group", false, spyRunner).catch(verifyCatch)
        tracker.start("group", false, runner).then(doneAll)
        expect(tracker.groups).to.have.keys("group")
        expect(tracker.pendingGroups).to.have.keys("group")
      }))
    })
  })

  describe("redrawAllAsync", () => {
    function mockDataAsync(group, callback) {
      callback(null, [])
    }

    function createChart() {
      const chart = {
        _invokeDataFetchListener: chai.spy(),
        expireCache: chai.spy(),
        redrawAsync: chai.spy(() => new Promise(resolve => resolve())),
        renderAsync: chai.spy(() => new Promise(resolve => resolve()))
      }
      return chart
    }

    let charts = []

    before(() => {
      charts = [createChart(), createChart(), createChart()]
      charts.forEach(chart => {
        dc.chartRegistry.register(chart)
      })
    })

    after(() => {
      dc.chartRegistry.clear()
    })

    it("should call redraw for each chart in the group", done => {
      Promise.resolve()
        .then(() => dc.renderAllAsync())
        .then(() => dc.redrawAllAsync())
        .then(() => {
          charts.forEach(chart => {
            expect(chart.redrawAsync).to.have.been.called.once()
          })
          done()
        })
    })
  })

  describe("groupAll getter/setter", () => {
    it("should properly set and get group", () => {
      const CROSSFILTER_ID = 1
      const group = { getCrossfilterId: () => CROSSFILTER_ID }
      dc.groupAll(group)
      expect(dc.groupAll()[CROSSFILTER_ID]).to.equal(group)
    })
  })
})
