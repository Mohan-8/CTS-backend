const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());

app.options("*", cors());
app.use(express.json());
app.use("/api/users", userRoutes);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log("Server is running in port " + process.env.PORT);
});
