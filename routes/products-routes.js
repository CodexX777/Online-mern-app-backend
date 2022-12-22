const express = require("express");

const router = express.Router();
const userControllers = require("../controllers/user-controllers");
const { check } = require("express-validator");
const checkAuth=require('../middleware/check-auth');



router.get("/search/:query",userControllers.searchQuery);

router.get("/", userControllers.getAllProducts);

router.use(checkAuth);


router.get("/myorders/:uid", userControllers.getOrderItems);

router.post("/buycart",userControllers.buyCartItems);



router.post(
  "/buynow",
  [check("uid").not().isEmpty(), check("pid").not().isEmpty()],
  userControllers.buyNow
);

router.post(
  "/remove",
  [check("uid").not().isEmpty(), check("deleteItems").not().isEmpty()],
  userControllers.removeFromCart
);

router.post(
  "/addtocart",
  [check("uid").not().isEmpty(), check("pid").not().isEmpty()],
  userControllers.addToCart
);


module.exports = router;
