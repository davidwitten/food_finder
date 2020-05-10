const express = require('express');
const fetch = require('node-fetch')
const app = express();

app.use(express.json());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

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
 * Given a list of vendor IDs, return the actual vendors that have your food
 */
async function getPrices(name) {
  const vendors = await getVendors(name);
  let result = [];
  for (let i = 0; i < vendors.length; ++i) {
    let prices = await fetch("http://localhost:3000/api/prices/" + vendors[i])
        .then(res => res.json())
        .catch((err) => {console.log(err)});
    result.push(prices);
  }
  return result;
}

app.post('/api/vendors', async (req, res) => {
  const result = await getPrices(req.body.food);
  res.send(result);
});

app.get("/api/vendors/:food", (req, res) => {
  const validSuppliers = foodSuppliers.filter(word => req.params.food === word.food);
  res.send(validSuppliers)
});

app.get("/api/prices/:vendor", (req, res) => {
  const validVendors = foodVendors.filter(word => parseInt(req.params.vendor) === word.id);
  res.send(validVendors)
});

// PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port} `)
});
