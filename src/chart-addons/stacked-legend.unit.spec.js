import { expect } from "chai"
import { toLegendState } from "./stacked-legend"

describe("Stacked Legend", () => {
  describe("toLegendState helper", () => {
    it("should nominal", () => {
      expect(
        toLegendState([
          {
            type: "ordinal",
            domain: ["en", "pt", "es", "in", "und", "ja"],
            range: [
              "#27aeef",
              "#ea5545",
              "#87bc45",
              "#b33dc6",
              "#f46a9b",
              "#ede15b"
            ]
          }
        ])
      ).to.deep.equal({
        type: "nominal",
        title: "Legend",
        open: true,
        domain: ["en", "pt", "es", "in", "und", "ja"],
        position: "bottom-left",
        range: [
          "#27aeef",
          "#ea5545",
          "#87bc45",
          "#b33dc6",
          "#f46a9b",
          "#ede15b"
        ]
      })
    })
    it("should gradient", () => {
      expect(
        toLegendState([
          {
            type: "quantitative",
            domain: [0, 100],
            range: [
              "#27aeef",
              "#ea5545",
              "#87bc45",
              "#b33dc6",
              "#f46a9b",
              "#ede15b"
            ],
            legend: {
              title: "My Legend",
              locked: true
            }
          }
        ])
      ).to.deep.equal({
        type: "gradient",
        title: "My Legend",
        locked: true,
        open: true,
        domain: [0, 100],
        position: "bottom-left",
        range: [
          "#27aeef",
          "#ea5545",
          "#87bc45",
          "#b33dc6",
          "#f46a9b",
          "#ede15b"
        ]
      })
    })
    it("should undefined", () => {})
    it("should stacked", () => {})
  })
})
