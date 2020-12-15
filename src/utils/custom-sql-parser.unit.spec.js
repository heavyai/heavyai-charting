import parseFactsFromCustomSQL from "./custom-sql-parser"
import { expect } from "chai"

describe("parseFactsFromCustomSQL", () => {
  describe("approx_count_distinct(caid) / us_census_block_groups_ca_2017.population", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "safegraph_binned_2019_07_hour_40_degree_meters_pois_home_tracts_bgs",
      "color",
      "approx_count_distinct(caid) / us_census_block_groups_ca_2017.population"
    )

    it("should project the approx_count_distinct", () => {
      expect(factProjections).to.have.lengthOf(1)
      expect(factProjections[0]).to.equal("approx_count_distinct(caid)")
    })

    it("should have a single alias", () => {
      expect(factAliases).to.have.lengthOf(1)
      expect(factAliases[0]).to.equal("color0")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "color.color0 / us_census_block_groups_ca_2017.population"
      )
    })
  })

  describe("sum(taxi_fare) + sum(bus_fare) / (us_census_block_groups_ca_2017.num_taxis + us_census_block_groups_ca_2017.num_buses)", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "safegraph_binned_2019_07_hour_40_degree_meters_pois_home_tracts_bgs",
      "color",
      "(sum(taxi_fare) + sum(bus_fare)) / (us_census_block_groups_ca_2017.num_taxis + us_census_block_groups_ca_2017.num_buses)"
    )

    it("should project the sum of sums", () => {
      expect(factProjections).to.have.lengthOf(1)
      expect(factProjections[0]).to.equal("(sum(taxi_fare) + sum(bus_fare))")
    })

    it("should have a single alias", () => {
      expect(factAliases).to.have.lengthOf(1)
      expect(factAliases[0]).to.equal("color0")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "color.color0 / (us_census_block_groups_ca_2017.num_taxis + us_census_block_groups_ca_2017.num_buses)"
      )
    })
  })

  describe("dimension.column * fact.col1 + fact.col2", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "fact",
      "color",
      "dimension.column * fact.col1 + fact.col2"
    )

    it("should project twice to respect the order-of-operations", () => {
      expect(factProjections).to.have.lengthOf(2)
      expect(factProjections[0]).to.equal("fact.col1")
      expect(factProjections[1]).to.equal("fact.col2")
    })

    it("should have two aliases", () => {
      expect(factAliases).to.have.lengthOf(2)
      expect(factAliases[0]).to.equal("color0")
      expect(factAliases[1]).to.equal("color1")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "dimension.column * color.color0 + color.color1"
      )
    })
  })

  describe("fact.col1 + fact.col2 / dimension.column", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "fact",
      "color",
      "fact.col1 + fact.col2 / dimension.column"
    )

    it("should project twice to respect the order-of-operations", () => {
      expect(factProjections).to.have.lengthOf(2)
      expect(factProjections[0]).to.equal("fact.col1")
      expect(factProjections[1]).to.equal("fact.col2")
    })

    it("should have two aliases", () => {
      expect(factAliases).to.have.lengthOf(2)
      expect(factAliases[0]).to.equal("color0")
      expect(factAliases[1]).to.equal("color1")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "color.color0 + color.color1 / dimension.column"
      )
    })
  })

  describe("cast(approx_count_distinct(caid) as float) / acs_bg_age_education_income_shapefile_ca.B00001_001_totalpop", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "fact",
      "color",
      "cast(approx_count_distinct(caid) as float) / acs_bg_age_education_income_shapefile_ca.B00001_001_totalpop"
    )

    it("should project the cast", () => {
      expect(factProjections).to.have.lengthOf(1)
      expect(factProjections[0]).to.equal(
        "cast(approx_count_distinct(caid) as float)"
      )
    })

    it("should have one alias", () => {
      expect(factAliases).to.have.lengthOf(1)
      expect(factAliases[0]).to.equal("color0")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "color.color0 / acs_bg_age_education_income_shapefile_ca.B00001_001_totalpop"
      )
    })
  })

  describe("avg(case when id='48' then 0 else omnisci_states.rid end)", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "fact",
      "color",
      "avg(case when id='48' then 0 else omnisci_states.rid end)"
    )

    it("should project the first condition", () => {
      expect(factProjections).to.have.lengthOf(1)
      expect(factProjections[0]).to.equal("id='48'")
    })

    it("should have one alias", () => {
      expect(factAliases).to.have.lengthOf(1)
      expect(factAliases[0]).to.equal("color0")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "avg(case when color.color0 then 0 else omnisci_states.rid end)"
      )
    })
  })

  describe("sum(case when flight_year > 20.0 then origin_lat end)", () => {
    const {
      factProjections,
      factAliases,
      expression
    } = parseFactsFromCustomSQL(
      "fact",
      "color",
      "sum(case when flight_year > 20.0 then origin_lat end)"
    )

    it("should project the first condition", () => {
      expect(factProjections).to.have.lengthOf(1)
      expect(factProjections[0]).to.equal("sum(case when flight_year > 20.0 then origin_lat end)")
    })

    it("should have one alias", () => {
      expect(factAliases).to.have.lengthOf(1)
      expect(factAliases[0]).to.equal("color0")
    })

    it("should have replaced the fact projections", () => {
      expect(expression).to.equal(
        "color.color0"
      )
    })
  })
})
