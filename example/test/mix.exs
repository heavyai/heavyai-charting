defmodule Test.Mixfile do
  use Mix.Project

  def project do
    [app: :test,
     version: "0.1.0",
     elixir: "~> 1.4",
     build_embedded: Mix.env == :prod,
     start_permanent: Mix.env == :prod,
     deps: deps()]
  end

  def application do
    [extra_applications: [:logger, :whippet, :beagle]]
  end

  defp deps do
    [
      {:hound, "~> 1.0"},
      {:beagle, github: "mrblueblue/beagle"},
      {:whippet, github: "mrblueblue/whippet"}
    ]
  end
end
