const express = require("express");
const app = express();
const path = require("path");
const bodyparser = require("body-parser");
const cors = require('cors')
app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));


// database
require('./database/db')

//routes
const memberRoutes = require('./router/member_routes');
const authRoutes = require("./router/authRoutes");
const idcardRoute = require('./router/idcard');
const idcardPreview = require("./router/idcardPreview");
const associateRoutes = require("./router/associateRoutes");
const adminRoutes = require("./admin/routes/adminRoutes");
const placeRoutes = require("./admin/routes/places");
const blogRoute = require("./admin/routes/admin");
const newsRoutes = require("./admin/routes/newsRoutes");
const enquiryRoutes = require("./admin/routes/enquiryRoutes");
const associatesRoute = require('./admin/routes/associates');
const routerGallery = require('./router/gallery');
const routegalleryUpdate = require("./admin/routes/gallery");
const routeVideos = require("./admin/routes/videos");
const userRoutes = require('./router/users');
const guidePublic = require("./router/guidePublic");
const placeImagesRouter = require("../tourist_guide/admin/routes/placeImages");


//ejs

app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));
app.set("views", [
  path.join(__dirname, "views"),        // user panel views
  path.join(__dirname, "admin/views"),  // admin panel views
]);
app.use(express.static(path.join(__dirname, "views/assets")));

const router = require("./router/router");


app.use("/", router);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'admin/public/uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin/public')));


// routes
app.use('/member', memberRoutes);
app.use("/auth", authRoutes);
app.use('/api/idcard', idcardRoute);
app.use('/api/idcard/preview', idcardPreview);
app.use("/associate_registration", associateRoutes);
app.use("/admin", adminRoutes);
app.use("/places", placeRoutes);
app.use("/blogs", blogRoute);
app.use("/admin", newsRoutes);
app.use("/admin", enquiryRoutes);
app.use('/admin/associates', associatesRoute);
app.use("/api/gallery", routerGallery);
app.use("/admin/gallery", routegalleryUpdate);
app.use("/admin/videos", routeVideos);
app.use('/api/users', userRoutes);
app.use("/api", guidePublic);
app.use("/admin/place-images", placeImagesRouter);


//server
const port = 2003;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);

})