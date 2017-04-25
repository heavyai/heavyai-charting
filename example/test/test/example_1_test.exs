defmodule ExampleOne do
  use ExUnit.Case, async: true
  use Hound.Helpers
  use Whippet

  @url Application.get_env(:test, :url)

  setup do
    Hound.start_session
    navigate_to("#{@url}/example1.html")
    :ok
  end

  test "Example 1" do
    assert Chart.Row.is_valid(".chart1-example")
    assert Chart.Bubble.is_valid(".chart2-example")
    assert Chart.Line.is_valid(".chart3-example")
    assert Chart.Count.selected() == Whippet.Chart.Count.all()
  end
end
