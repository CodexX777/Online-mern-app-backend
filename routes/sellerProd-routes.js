const express = require("express");

const sellerController = require("../controllers/seller-controller");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.post(
  "/login",
  [check("email").isEmail(), check("password").not().isEmpty()],
  sellerController.login
);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").isEmail(),
    check("password").isLength({ min: 6 }),
    check("phoneNo").isLength({ min: 10, max: 10 }),
    check("GstNo").isLength({ min: 15, max: 15 }),
  ],
  sellerController.signup
);

router.use(checkAuth);

router.get("/:uid", sellerController.getSellerProducts);

router.delete("/:uid/:pid", sellerController.deleteProduct);

router.post(
  "/add",
  fileUpload.single("file"),
  [
    check("prodName").not().isEmpty(),
    check("prodDesc").not().isEmpty(),
    check("prodPrice").not().isEmpty(),
    check("prodStock").not().isEmpty(),
    check("uid").not().isEmpty(),
  ],
  sellerController.addProduct
);

router.patch(
  "/update",
  [
    check("uid").not().isEmpty(),
    check("pid").not().isEmpty(),
    check("prodPrice").not().isEmpty(),
    check("prodStock").not().isEmpty(),
  ],
  sellerController.updateProduct
);

module.exports = router;
