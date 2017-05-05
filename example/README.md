# Charting Examples

To run the examples locally, go to the root directory and run:

```bash
npm start
```

## Running Integration Tests

The integrations tests for the charting examples are written in [Elixir](http://elixir-lang.org/) using the [Hound](https://github.com/HashNuke/hound) library.

To run the tests, first install the selenium server by running from the root directory:

```bash
npm run selenium:install
```

Then start the selenium server:

```bash
npm run selenium:start

```

Next, go into  the `example/test` directory and run:

```bash
mix deps.get
```

Once that is done, you can run the tests with:

```bash
mix test
```
