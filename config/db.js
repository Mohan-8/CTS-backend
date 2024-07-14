// const { Pool } = require("pg");
// require("dotenv").config();

// const dbPool = new Pool({
//   user: process.env.DATABASE_USER,
//   host: process.env.DATABASE_HOST,
//   database: process.env.DATABASE_NAME,
//   password: process.env.DATABASE_PASSWORD,
//   port: process.env.DATABASE_PORT,
// });
const { Pool } = require("pg");
require("dotenv").config();

const dbPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});
module.exports = dbPool;
