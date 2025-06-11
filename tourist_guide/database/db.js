const mysql = require("mysql");
const dotenv = require("dotenv");
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  database: process.env.database,
  timezone: '+05:30'
});


connection.connect((error) => {
  if (error) {
    throw error;
    console.log("Database connection failed: " + error.message);
  } else {
    console.log("Database connected successfully");
  }
});


module.exports = connection;