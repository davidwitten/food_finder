const express = require('express');
const fetch = require('node-fetch')
const app = express();
const opentelemetry = require('@opentelemetry/api');
const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { MeterProvider } = require('@opentelemetry/metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

app.use(express.json());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

// Setup for OpenTelemetry
const tracer_exporter = new JaegerExporter({ serviceName: 'food-finder' });
const provider = new BasicTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(tracer_exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();
const tracer = opentelemetry.trace.getTracer('example-basic-tracer-node');

const metric_exporter = new PrometheusExporter(
    {
      startServer: true,
    },
    () => {
      console.log('prometheus scrape endpoint: http://localhost:9090/metrics');
    },
);
const meter = new MeterProvider({
  exporter: metric_exporter,
  interval: 1000,
}).getMeter('example-prometheus');

// Monotonic counters can only be increased.
const requestCount = meter.createCounter('Requests', {
  monotonic: true,
  labelKeys: ['pid'],
  description: 'Counts the number of requests',
});
const labels = {pid: process.pid}




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
async function getVendors(name, price_span) {
  const vendorSpan = tracer.startSpan("getVendors", {parent:price_span});
  let food = await fetch("http://localhost:3000/api/vendors/" + name)
      .then(res => res.json())
      .catch((err) => {console.log(err)});
  vendorSpan.setAttribute('name', name);
  vendorSpan.addEvent('Getting vendors');
  vendorSpan.end();
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
  const price_span = tracer.startSpan(`getPrices_${name}`);
  const vendors = await getVendors(name, price_span);
  let result = [];
  for (let id = 0; id < vendors.length; ++id) {
    find_id = tracer.startSpan(`ID_${id}`, {parent:price_span});

    let prices = await fetch("http://localhost:3000/api/prices/" + vendors[id])
        .then(res => res.json())
        .catch((err) => {console.log(err)});
    result.push(prices);

    find_id.setAttribute("name", id);
    find_id.addEvent("Extracted ID information");
    find_id.end();
  }
  price_span.addEvent("Overall event");
  price_span.end();
  return result;
}

// Sends a food, returns the prices of every vendor that has it
app.post('/api/vendors', async (req, res) => {
  requestCount.bind(labels).add(1);
  const result = await getPrices(req.body.food);
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
