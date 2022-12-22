const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const Product = require("../models/products");
const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const getOrderItems = async (req, res, next) => {
  const userId = req.params.uid;

  let user;

  if(userId!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }


  try {
    user = await User.findById(userId).populate("orders");
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }
  res.status(200).json(user.orders);
  //destructure the jwt token and get the userid from there and fetch the cart items of that user

  // or rather just get the uid from the url
};

const getCartElements = async (req, res, next) => {
  const userId = req.params.uid;

  if(userId!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  let user;

  try {
    user = await User.findById(userId).populate("cart");
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  
  res.status(200).json(user.cart);
  //destructure the jwt token and get the userid from there and fetch the cart items of that user
};


const updateAddress = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }
 

  const userId = req.params.uid;


  const { address } = req.body;

  if(req.userData.userId!==userId){
    return next(
      new HttpError("You are not allowed to update the address.", 401)
    );
  }

  const filter = { _id: userId };

  const update = {
    $set: {
      address,
    },
  };
  let result;
  try {
    result = await User.updateOne(filter, update);
  } catch (error) {
    return next(new HttpError("Could not update the user address"), 500);
  }

  res.status(200).json(result);
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  const { name, email, password, phoneNo } = req.body;

  let hasUser;

  try {
    hasUser = await User.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later", 500)
    );
  }

  if (hasUser) {
    return next(
      new HttpError("Could not create user, Email already exists", 422)
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

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    phoneNo,
    address: "Please Update Your Address",
    cart: [],
    orders: [],
  });

  try {
    await newUser.save();
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  let token;
  try {
    token = jwt.sign(
      { uid: newUser._id, email: newUser.email },
      "shivang_CodexX_260279",
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res
    .status(201)
    .json({ uid: newUser._id, email: newUser.email, token: token,address:newUser.address });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  if (!user) {
    return next(
      new HttpError(
        "Could not identify user, Credentials seem to be wrong.",
        401
      )
    );
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, user.password);
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
      { uid: user._id, email: user.email },
      "shivang_CodexX_260279",
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({ uid: user._id, email: user.email, token: token,address:user.address });
};

const removeFromCart = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  let user;
  let sess;

  const { uid, deleteItems } = req.body;

  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  try {
    user = await User.findById(uid);
    //let prod = await Product.findById(pid);
    if (!user) {
      return next(new HttpError("Invalid user or product id", 404));
    }

    sess = await mongoose.startSession();
    sess.startTransaction();

    for (let i = 0; i < deleteItems.length; i++) {
      user.cart.pull(deleteItems[i]);
      await user.save({ session: sess });
    }

    sess.commitTransaction();
  } catch (error) {
    sess.abortTransaction();
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({ message: "Item removed from your cart" });
};

const searchQuery = async (req, res, next) => {
  const query = req.params.query;
  const regex = new RegExp(query, "i");
  let prods;
  try {
    prods = await Product.find({
      prodName: {
        $regex: regex,
      },
    });
  } catch (error) {
    console.log(error);
  }

  res.status(200).json(prods);
};

const buyNow = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid product id, Please check your data.", 422)
    );
  }
  const { pid, uid } = req.body;

  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }


  let user;
  let sess;
  try {
    user = await User.findById(uid);
    let prod = await Product.findById(pid);

    if (!user || !prod) {
      return next(new HttpError("Invalid user or product id", 404));
    }

    sess = await mongoose.startSession();
    sess.startTransaction();
    user.orders.push(pid);
    await user.save({ session: sess });
    sess.commitTransaction();
  } catch (error) {
    sess.abortTransaction();
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({ message: "Item ordered successfully" });
};

const buyCartItems = async (req, res, next) => {
  //we expect a json obejct with uid and an array of cartItem object id's


  const { uid, cartItems } = req.body;

  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }


  let user;
  let sess;
  try {
    user = await User.findById(uid);
    //
    if (!user) {
      return next(new HttpError("Invalid user id", 404));
    }

    sess = await mongoose.startSession();
    sess.startTransaction();

    for (let i = 0; i < cartItems.length; i++) {
      let prod = await Product.findById(cartItems[i]);
      if (prod) {
        user.orders.push(prod._id);
        user.cart.pull(prod._id);
        await user.save({ session: sess });
      }
    }

    sess.commitTransaction();
  } catch (error) {
    sess.abortTransaction();
    console.log(error);
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({ message: "Items ordered successfully" });
};

const addToCart = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, Please check your data.", 422)
    );
  }

  const { pid, uid } = req.body;
  if(uid!==req.userData.userId ){
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }



  let user;
  let sess;
  try {
    user = await User.findById(uid);
    let prod = await Product.findById(pid);
    if (!user || !prod) {
      return next(new HttpError("Invalid user or product id", 404));
    }

    sess = await mongoose.startSession();
    sess.startTransaction();
    user.cart.push(pid);
    await user.save({ session: sess });
    sess.commitTransaction();
  } catch (error) {
    sess.abortTransaction();
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({ message: "Item added to your cart" });
};

const getAllProducts = async (req, res, next) => {
  let products;
  products = await Product.find()
    .clone()
    .catch((err) => {
      const error = new HttpError(
        "Something went wrong, Could not fetch products.",
        500
      );
      return next(error);
    });

  res.status(200).json(products);
};

exports.searchQuery = searchQuery;
exports.buyCartItems = buyCartItems;
exports.buyNow = buyNow;
exports.getOrderItems = getOrderItems;
exports.removeFromCart = removeFromCart;
exports.getAllProducts = getAllProducts;
exports.addToCart = addToCart;
exports.signup = signup;
exports.login = login;
exports.updateAddress = updateAddress;
exports.getCartElements = getCartElements;
// exports.getUserAddress = getUserAddress;
