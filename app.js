const express = require("express");
const bodyParser = require("body-parser");

const sellerProdRoutes = require("./routes/sellerProd-routes");
const userRoute = require("./routes/user-routes");
const productRoute = require("./routes/products-routes");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");
const path = require("path");
const app = express();

//middlewares

app.use(bodyParser.json()); 



app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type,Accept,Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
  next();
});

app.use("/api/products", productRoute);
app.use("/api/myproducts", sellerProdRoutes);
app.use("/api/user", userRoute);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

//while calling this error middleware we can use return next(error) for async tasks and throw for sync tasks

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xvgrljc.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT||5000);
  })
  .catch((err) => {
    console.log(err);
  });
