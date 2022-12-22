const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
  prodName: { type: String, required: true },
  prodPrice: { type: Number, required: true },
  prodImage: { type: String, required: true },
  ratingSum: { type: Number, required: true },
  totalRating: { type: Number, required: true },
  uid: {type: mongoose.Types.ObjectId, required:true,ref:'Seller'},
  prodStock: { type: Number, required: true },
  prodDesc: { type: String, required: true }
});

module.exports = mongoose.model("Product", productSchema);
