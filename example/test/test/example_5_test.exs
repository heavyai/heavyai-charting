defmodule ExampleFive do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)
  @node "#chart1-example"

  setup do
    Hound.start_session
    navigate_to("#{@url}/example5.html")
    :timer.sleep(5000)
    :ok
  end

  test "Example 5" do
    assert Chart.Raster.is_valid(@node, %{legend: false, use_map: true})

    selected = Chart.Count.selected()
    Chart.Raster.draw_polyline(@node, [{200, 200}, {300, 400}, {400, 500}])
    assert Chart.Count.selected() !== selected
    Chart.Raster.remove_selection(@node, 200, 200)
    assert Chart.Count.selected() == selected

    selected = Chart.Count.selected()
    Chart.Raster.draw_lasso(@node, [{200, 200}, {300, 400}, {400, 500}, {100, 300}])
    assert Chart.Count.selected() !== selected
    Chart.Raster.remove_selection(@node, 200, 200)
    assert Chart.Count.selected() == selected


    selected = Chart.Count.selected()
    Chart.Raster.draw_circle(@node, 600, 600)
    assert Chart.Count.selected() !== selected
    Chart.Raster.remove_selection(@node, 600, 600)
    assert Chart.Count.selected() == selected
  end
end
