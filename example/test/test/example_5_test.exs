defmodule ExampleFive do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)

  setup do
    Hound.start_session
    navigate_to("#{@url}/example5.html")
    :ok
  end

  test "Example 5" do
    assert Chart.Raster.is_valid("#chart1-example", %{legend: false, use_map: true})
  end
end
