const express = require("express");


const userControllers = require("../controllers/user-controllers");
const { check } = require("express-validator");
const checkAuth=require('../middleware/check-auth');

const router = express.Router();
router.post(
  "/login",
  [check("email").isEmail(), check("password").isLength({ min: 6 })],
  userControllers.login
);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userControllers.signup
);

router.use(checkAuth);


router.patch(
  "/address/:uid",
  check("address").not().isEmpty(),
  userControllers.updateAddress
);

router.get("/cart/:uid", userControllers.getCartElements);

module.exports = router;
