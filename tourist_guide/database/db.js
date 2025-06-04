const mysql = require("mysql");
const dotenv  = require("dotenv");
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  database: process.env.database,
});



connection.connect((err)=>{
    if (err) {
        throw err;
    }
    else console.log("database connected");  
})


module.exports = connection;