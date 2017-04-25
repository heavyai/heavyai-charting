defmodule ExampleThree do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)

  setup do
    Hound.start_session
    navigate_to("#{@url}/example3.html")
    :ok
  end

  test "Example 3" do
    assert Chart.Raster.is_valid("#polymap", %{legend: false, use_map: true})
    assert Chart.Line.is_valid("#timechart")
  end
end
