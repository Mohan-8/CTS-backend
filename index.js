const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/users/", require("./routes/userRoutes"));
app.post("/api/users/signup", require("./routes/userRoutes"));
app.get("/api/users/success", require("./routes/userRoutes"));
app.get("/api/users/cancel", require("./routes/userRoutes"));
app.post("/api/users/login", require("./routes/userRoutes"));
app.get("/api/users/getUserDetails/:id", require("./routes/userRoutes"));
app.put("/api/users/updateUserDetails/:id", require("./routes/userRoutes"));
app.get("/api/users/getAllUserDetails", require("./routes/userRoutes"));

app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log("Server is running in port " + process.env.PORT);
});
