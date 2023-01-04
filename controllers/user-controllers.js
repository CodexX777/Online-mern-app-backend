const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const Product = require("../models/products");
const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

// const s3 = new S3Client({
//   credentials: {
//     accessKeyId: "ASIARWVBFRVEQ2QNLCKE",
//     secretAccessKey: "4doSEDPnmOzLBgN8Qs9Sy/yQtf4yFZxoMCa+HQIE",
//     sessionToken:
//       "IQoJb3JpZ2luX2VjEEcaCmFwLXNvdXRoLTEiSDBGAiEAw0aU66O+R5GDYu+mZ14CS6NfFwlXsgu1ewQY8om4gR4CIQCEqulIo7i290zj6StBnEyTWXw0gAzy9VPuudzg7eXbjyqzAgiQ//////////8BEAAaDDExNzM3NTg2NDEzNyIMoQTzXg2gQLJPrWytKocCULM+pl894KTCC1ybiH1YuZzy+qpOK8p12kpzXvR3TS6zPX5MOP3t7ZhOFs4KtBF36estiQYal7Kf6jD1YRvpWmQuwpysMoqrAGdFtlaM7C89g5V8OoXneNnh/jk73vHwz0DWGY3ZFW1iYn748+DQHKQ66utjvBEkNaRfd3+eNaYSSZxvDI8AxzsKB2iROHPrzI+oTeFY/qh5YWppy2t8In86GdUDZFjjECZ5fwVsNDAbUXFq0cRFTBmHuGnBOCbZC/virrejT6NZtEtmvTQlrwA/8jBGqCiTThpGodxLHdbQy55XYEvWDs1UifViTZDtmWUZWdLhdMkGoMRJXpHSCjZ2ozM4bi8wjKLBnQY6nAFU8rA9LIDF9TYpMzaO/WqpdQhO4TMuGTHmWsuYyfUk39I+fHj28taUBpXriUMKGkmKGGUjhQ7fLI4t6Uzfm0szLoIaTJqALvqRYBGGwct78hvgEVql85YIbITcsqFfmGqNezMRHOuYvqb4IyMTotwiYt8tNpoaGSonk4RIOnjJCAmJHWDqIc+jX2q3x3F3iOVKKOkCT96uLXgrRMI=",
//   },
//   region: "ap-southeast-1",
// });

const getOrderItems = async (req, res, next) => {
  const userId = req.params.uid;

  let user;
  let userData;
  if (userId !== req.userData.userId) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  try {
    user = await User.findById(userId).populate("orders");

    //Since user is a mongoDB object and not a json object hence to make modifying this object easy I have converted It into a JSON object
    userData = user.toJSON();

    // console.log(user);
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  try {
    for (let i = 0; i < userData.orders.length; i++) {
      // const getObjectParams = {
      //   Bucket: "cyclic-nutty-dress-bass-ap-southeast-1",
      //   Key: userData.orders[i].prodImage,
      // };
      //console.log(userData.orders[i]);

      // const command = new GetObjectCommand(getObjectParams);

      const params = {
        Bucket: process.env.BUCKET,
        Key: userData.orders[i].prodImage,
        Expires: 3600,
      };

      const url = await s3.getSignedUrl("getObject", params);
      userData.orders[i].imageUrl = url;
      // console.log(userData.orders[i]);
      // console.log(url);
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not fetch products.",
      500
    );
    return next(error);
  }

  res.status(200).json(userData.orders);
};

const getCartElements = async (req, res, next) => {
  const userId = req.params.uid;

  if (userId !== req.userData.userId) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  let user;
  let userData;
  try {
    user = await User.findById(userId).populate("cart");
    userData = user.toJSON();
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  // console.log(user);
  if (!user) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  //console.log(userData + " This was user data \n");

  try {
    // console.log(userData.cart);
    for (let i = 0; i < userData.cart.length; i++) {
      //console.log(userData.cart[i].prodImage);
      // const getObjectParams = {
      //   Bucket: "cyclic-nutty-dress-bass-ap-southeast-1",
      //   Key: userData.cart[i].prodImage,
      // };
      // const command = new GetObjectCommand(getObjectParams);
      // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      const params = {
        Bucket:process.env.BUCKET,
        Key: userData.cart[i].prodImage,
        Expires: 3600,
      };

      const url = await s3.getSignedUrl("getObject", params);
      userData.cart[i].imageUrl = url;
      // console.log(userData.cart[i]);
    }
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, Could not fetch products.",
      500
    );
    return next(error);
  }

  // console.log(userData.cart);
  res.status(200).json(userData.cart);
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

  if (req.userData.userId !== userId) {
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
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(201).json({
    uid: newUser._id,
    email: newUser.email,
    token: token,
    address: newUser.address,
  });
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
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Something went wrong, please try again later.", 500)
    );
  }

  res.status(200).json({
    uid: user._id,
    email: user.email,
    token: token,
    address: user.address,
  });
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

  if (uid !== req.userData.userId) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  try {
    user = await User.findById(uid);

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

  try {
    for (let i = 0; i < prods.length; i++) {
      // const getObjectParams = {
      //   Bucket: "cyclic-nutty-dress-bass-ap-southeast-1",
      //   Key: prods[i].prodImage,
      // };
      // const command = new GetObjectCommand(getObjectParams);
      // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      const params = {
        Bucket: process.env.BUCKET,
        Key: prods[i].prodImage,
        Expires: 3600,
      };

      const url = await s3.getSignedUrl("getObject", params);

      prods[i] = {
        ...prods[i]._doc, // _doc is the key for the document that is fetched from the mongo server
        imageUrl: url,
      };
      // prods[i] = {
      //   ...prods[i]._doc, // _doc is the key for the document that is fetched from the mongo server
      //   imageUrl: url,
      // };
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not fetch products.",
      500
    );
    return next(error);
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

  if (uid !== req.userData.userId) {
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

    if (prod.prodStock == 0) {
      return next(new HttpError("Product is out of stock.", 404));
    }

    sess = await mongoose.startSession();
    sess.startTransaction();
    user.orders.push(pid);
    prod.prodStock = prod.prodStock - 1;
    await prod.save({ session: sess });
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
  const { uid, cartItems } = req.body;

  if (uid !== req.userData.userId) {
    return next(new HttpError("Cannot find the user, Invalid user id.", 404));
  }

  let user;
  let sess;
  try {
    user = await User.findById(uid);

    if (!user) {
      return next(new HttpError("Invalid user id", 404));
    }

    const prodCount = new Map();
    for (const id of cartItems) {
      if (!prodCount.has(id)) {
        prodCount.set(id, 1);
      } else {
        prodCount.set(id, prodCount.get(id) + 1);
      }
    }

    sess = await mongoose.startSession();
    sess.startTransaction();

    for (const [id, quantity] of prodCount) {
      const prod = await Product.findById(id);
      if (prod.prodStock < quantity) {
        sess.abortTransaction();
        return next(
          new HttpError(
            "Some products do not have sufficient stock, please check your cart",
            404
          )
        );
      }
    }

    for (let i = 0; i < cartItems.length; i++) {
      let prod = await Product.findById(cartItems[i]);
      if (prod) {
        user.orders.push(prod._id);
        user.cart.pull(prod._id);
        prod.prodStock = prod.prodStock - 1;
        await user.save({ session: sess });
        await prod.save({ session: sess });
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
  if (uid !== req.userData.userId) {
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

  try {
    for (let i = 0; i < products.length; i++) {
      // const getObjectParams = {
      //   Bucket: "cyclic-nutty-dress-bass-ap-southeast-1",
      //   Key: products[i].prodImage,
      // };
      // const command = new GetObjectCommand(getObjectParams);
      // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      const params = {
        Bucket: process.env.BUCKET,
        Key: userData.orders[i].prodImage,
        Expires: 3600,
      };
      const url = await s3.getSignedUrl("getObject", params);

      //products[i].imageUrl=url;
      //let obj=[{ a:1,b:2},{ a:1,b:2}]
      //obj[1].c=3;

      products[i] = {
        ...products[i]._doc, // _doc is the key for the document that is fetched from the mongo server
        imageUrl: url,
      };
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not fetch products.",
      500
    );
    return next(error);
  }

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
