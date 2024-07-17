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

router.get("/api/users/").get(getAll);
router.post("/api/users/signup").post(signUp);
router.get("/api/users/success").get(success);
router.get("/api/users/cancel").get(cancel);
router.post("/api/users/login").post(login);
router.get("/api/users/getUserDetails/:id").get(getUserDetails);
router.put("/api/users/updateUserDetails/:id").put(updateUserDetails);
router.get("/api/users/getAllUserDetails").get(getAllUserDetails);
module.exports = router;
