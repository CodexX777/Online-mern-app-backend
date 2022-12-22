const HttpError = require("../models/http-error");
const Product = require("../models/products");
const { validationResult } = require("express-validator");
const Seller = require("../models/seller");
const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const addProduct = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  const { prodName, prodPrice, prodDesc, prodStock, uid } = req.body;

  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }


  const newProduct = new Product({
    prodName,
    prodDesc,
    prodStock,
    prodImage: req.file.path,
    prodPrice,
    uid,
    ratingSum: 0,
    totalRating: 0,
  });

  let seller;
  try {
    seller = await Seller.findById(uid);
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  if (!seller) {
    return next(
      new HttpError("Invalid seller Id, Could not find the seller.", 404)
    );
  }

  let sess;

  try {
    // await newProduct.save();
    sess = await mongoose.startSession();

    sess.startTransaction();

    await newProduct.save({ session: sess });

    seller.products.push(newProduct);

    await seller.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    sess.abortTransaction();
    const error = new HttpError("Could not add product. Please try again", 500);
    return next(error);
  }

  res.status(201).json({ newProd: newProduct });
};

const getSellerProducts = async (req, res, next) => {
  const sellerId = req.params.uid;
  //search this seller and fetch his products
  if(sellerId!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }



  let prods;

  prods = await Product.find({ uid: sellerId })
    .clone()
    .catch((err) => {
      return next(
        new HttpError(
          "Something went wrong, Could not fetch the seller products.",
          500
        )
      );
    });

  if (!prods || prods.length === 0) {
    return next(
      new HttpError("Could not find products for the provided sellerId.", 404)
    );
  }

  res.json(prods);
};

const deleteProduct = async (req, res, next) => {
  const prodId = req.params.pid;
  const sellerId = req.params.uid;

  let prod;

  try {
    prod = await Product.findById(prodId).populate("uid");
  } catch (error) {
    return next(
      new HttpError("Something went wrong, Could not delete the product", 500)
    );
  }

  if (!prod || !prod.uid._id.equals(sellerId)) {
    return next(
      new HttpError(
        "Could not delete the product.Invalid product or seller details ",
        404
      )
    );
  }

  let sess;
  try {
    sess = await mongoose.startSession();
    sess.startTransaction();
    await prod.remove({ session: sess });
    prod.uid.products.pull(prod);
    await prod.uid.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    sess.abortTransaction();
    return next(
      new HttpError("Something went wrong, Could not delete the product.", 500)
    );
  }

  res.status(200).json("deleted");
};

const updateProduct = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  const { uid, pid, prodPrice, prodStock } = req.body;
  
  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }



  const filter = { _id: pid, uid: uid };
  const updatedProduct = {
    $set: {
      prodPrice,
      prodStock,
    },
  };

  let result;
  try {
    result = await Product.updateOne(filter, updatedProduct);
  } catch (error) {
    return next(new HttpError("Could not update the product"), 500);
  }

  res.status(200).json({ result });
};

//signup function

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  const { name, email, password, phoneNo, GstNo } = req.body;

  let existingSeller;
  try {
    existingSeller = await Seller.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError("Signing up failed please try again later.", 500)
    );
  }

  if (existingSeller) {
    return next(
      new HttpError("User exists already, please login instead.", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(
      new HttpError("Could not create new user, Please try again.", 500)
    );
  }

  const newSeller = new Seller({
    name,
    email,
    password: hashedPassword,
    phoneNo,
    products: [],
    GstNo,
  });

  try {
    await newSeller.save();
  } catch (error) {
    return next("Signing up failed, please try again later.", 500);
  }

  let token;
  try {
    token = jwt.sign(
      { uid: newSeller._id, email: newSeller.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(201).json({ uid: newSeller._id, token: token });
};

//login function
const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingSeller;
  try {
    existingSeller = await Seller.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError("Logging in failed please try again later.", 500)
    );
  }

  if (!existingSeller) {
    return next(
      new HttpError("Invalid Credentials, could not log you in.", 401)
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingSeller.password);
  } catch (error) {
    return next(
      new HttpError("Could not login the user, Please try again.", 500)
    );
  }
  if (!isValidPassword) {
    return next(
      new HttpError(
        "Could not identify user, Credentials seem to be wrong.",
        401
      )
    );
  }

  let token;
  try {
    token = jwt.sign(
      { uid: existingSeller._id, email: existingSeller.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.json({uid:existingSeller._id,email:existingSeller.email,token:token});
};

exports.login = login;
exports.signup = signup;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.addProduct = addProduct;
exports.getSellerProducts = getSellerProducts;
