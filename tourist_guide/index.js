const express = require("express");
const app = express();
const path  = require("path");
const bodyparser = require("body-parser");
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

//ejs

app.set("view engine", "ejs");
app.set("views",path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname,"views/assets")));

const router  = require("./router/router");
app.use("/",router);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));


// database
require('./database/db')
const port = 2003;
app.listen(port, '0.0.0.0',()=>{
    console.log(`Server is running on port ${port}`);
    
})