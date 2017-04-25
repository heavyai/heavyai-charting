defmodule ExampleTwo do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)

  setup do
    Hound.start_session
    navigate_to("#{@url}/example2.html")
    :ok
  end

  test "Example 2" do
    assert Chart.Raster.is_valid("#chart1-example", %{legend: false, use_map: true})
    assert Chart.Line.is_valid(".chart2-example")
    assert Chart.Count.selected() == Whippet.Chart.Count.all()
  end
end
