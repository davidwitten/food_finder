const express = require('express');
const fetch = require('node-fetch')
const app = express();
const {globalStats, MeasureUnit, AggregationType} = require('@opencensus/core');
const tracing = require('@opencensus/nodejs');
const { PrometheusStatsExporter } = require('@opencensus/exporter-prometheus');

app.use(express.json());


// Open Census

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

// Setup for OpenTelemetry
const exporter = new PrometheusStatsExporter({
  port: 9464,
  startServer: true
});

globalStats.registerExporter(exporter);

const LATENCY_MS = globalStats.createMeasureInt64(
    'task_latency',
    MeasureUnit.MS,
    'The task latency in milliseconds'
);

const RESPONSE_COUNT = globalStats.createMeasureInt64(
    'vendor_response_count',
    MeasureUnit.UNIT,
    'The number of vendors returned per response'
);

// Register the view. It is imperative that this step exists,
// otherwise recorded metrics will be dropped and never exported.
const view2 = globalStats.createView(
    'vendor_response_distribution',
    RESPONSE_COUNT,
    AggregationType.DISTRIBUTION,
    [],
    'The distribution of the responses.',
    // Latency in buckets:
    // [>=0ms, >=100ms, >=200ms, >=400ms, >=1s, >=2s, >=4s]
    [0, 1, 2, 3, 4, 5, 6]
);

globalStats.registerView(view2);

// Register the view. It is imperative that this step exists,
// otherwise recorded metrics will be dropped and never exported.
const view = globalStats.createView(
    'task_latency_distribution',
    LATENCY_MS,
    AggregationType.DISTRIBUTION,
    [],
    'The distribution of the task latencies.',
    // Latency in buckets:
    // [>=0ms, >=100ms, >=200ms, >=400ms, >=1s, >=2s, >=4s]
    [0, 10, 20, 40, 100, 200, 400]
);

globalStats.registerView(view);


const foodSuppliers = [
  {food: "apple", vendors: [1]},
  {food: "grape", vendors: [1,3]},
  {food: "chicken", vendors: [2]},
  {food: "potato", vendors: [2]},
  {food: "fish", vendors: [3]},
]

const foodVendors = [
  {id: 1, inventory: {"apple":1.5, "grape":2.5}},
  {id: 2, inventory: {"potato":1.5, "chicken":2.5}},
  {id: 3, inventory: {"fish":1.5, "grape":2.5}},
]


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

/*
 * Given a food, return the IDs of vendors
 */
async function getVendors(name) {
  let food = await fetch("http://localhost:3000/api/vendors/" + name)
      .then(res => res.json())
      .catch((err) => {console.log(err)});
  if (!food.length) {
    return [];
  }
  return food[0].vendors;
}

/*
 * Given a food, return the actual vendors that have your food
 * This involves 2 steps, as given in the project specs.
 * 1) Find the vendor IDs
 * 2) Get the vendor information from those IDs
 */
async function getPrices(name) {
  const vendors = await getVendors(name);
  let result = [];
  globalStats.record([
    {
      measure: RESPONSE_COUNT,
      value: vendors.length,
    },
  ]);
  for (let id = 0; id < vendors.length; ++id) {

    let prices = await fetch("http://localhost:3000/api/prices/" + vendors[id])
        .then(res => res.json())
        .catch((err) => {console.log(err)});
    result.push(prices);

  }
  return result;
}

// Sends a food, returns the prices of every vendor that has it
app.post('/api/vendors', async (req, res) => {
  const requestReceived = new Date().getTime();
  const result = await getPrices(req.body.food);
  const measuredLatency = new Date().getTime() - requestReceived;
  globalStats.record([
    {
      measure: LATENCY_MS,
      value: measuredLatency,
    },
  ]);
  console.log("HERE");
  console.log(measuredLatency);
  res.send(result);
});

// Given an individual food, return the vendors that have it
app.get("/api/vendors/:food", (req, res) => {
  const validSuppliers = foodSuppliers.filter(item => req.params.food === item.food);
  res.send(validSuppliers)
});

// Given an individual vendor, return the prices of all their goods
app.get("/api/prices/:vendor", (req, res) => {
  const foodPrices = foodVendors.filter(vendor => parseInt(req.params.vendor) === vendor.id);
  res.send(foodPrices)
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port} `)
});
