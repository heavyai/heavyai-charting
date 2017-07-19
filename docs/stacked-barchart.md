# Stacked BarChart

A histogram with the ability to break down vertical bars of data in a histogram into multiple series.
## How to create a Stacked Barchart using the charting library

1. Create a dimension by passing in an array of the columns with the first item being the x-axis measure and the second item as the series measure: 

`var joinDimension = crossFilter.dimension(["join_time", "country"])`

2. Create a group using this dimension: 

`var joinGroup = joinDimension.group().reduceCount()`

3. Create a barChart using the dimension and group:

`var dcTimeChart = dc.barChart('.chart2-example')`
            ...
            `.dimension(joinDimension)`
            `.group(joinGroup);`

4. Set the series group to the desired group: 

`dcTimeChart.series().group(crossFilter.dimension('country').group())`


# Multi Series Mixin

Formats data from the group and dimension into the appropriate form so that the stack mixin can render the data correctly.

## seriesApi
How information about the series is set and accessed

* **group**: the group that the mixin will make into series e.g. "country"
* **values**: all values of the group that exist e.g. `["US", "BR", "ID", "AR", "TR", "GB", "JP", "MY", "ES", "PH", "FR", "SA", "TH", "RU", "MX", "CO", "IT", "PT", "CA", "UY", "CL"]`
* **selected**: selected values that will be stacked in the bar chart e.g. `["US", "BR", "ID", "AR", "TR"]`
* **keys**: Object that maps the selected values to the series number `{series_1: "US", other: "other", series_3: "BR", series_4: "ID", series_5: "TR"…}`

## processMultiSeriesResults
takes in unserialized data and outputs the data in the form of: 

* **keys**: the keys of what each stack on the barchart represents (each key is a series)
* **ranges**: 
* **data**: array of data objects that represent each x value. Each data item will have values for the series that have data for that x value.

The stackMixin organizes data by layers, which are then rendered in layer order in `bar-chart.js`
