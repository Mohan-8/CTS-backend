const express = require("express");
const router = express.Router();
const {
  signUp,
  getAll,
  success,
  login,
  getUserDetails,
  updateUserDetails,
  cancel,
  getAllUserDetails,
} = require("../controllers/userController");

router.post("/signup", signUp);
router.get("/success", success);
router.get("/cancel", cancel);
router.get("/", getAll);
router.post("/login", login);
router.get("/getUserDetails/:id", getUserDetails);
router.put("/updateUserDetails/:id", updateUserDetails);
router.get("/getAllUserDetails", getAllUserDetails);
module.exports = router;
