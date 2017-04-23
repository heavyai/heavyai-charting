defmodule ExampleMultiLayerMap do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)

  setup do
    Hound.start_session
    navigate_to("#{@url}/exampleMultiLayerMap.html")
    :ok
  end

  test "Example Multi-Layer Map" do
    assert Chart.Raster.is_valid("#chart1-example", %{legend: false, use_map: true})
  end
end
