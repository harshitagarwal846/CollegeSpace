const jwt = require("jsonwebtoken");
const User = require("../db/register.js");
const Space = require("../db/spaces.js");

//middleware for authenticating the cookies
const auth = async (req, res, next) => {
    try {
        const cookie = req.cookies.jwt;
        const user = jwt.verify(cookie, process.env.SECRET_KEY);
        // console.log(user);
        const currentUser = await User.findOne({ _id: user._id });
        // console.log(currentUser.firstname);

        req.currentUser = currentUser; //to store the details of the current user
        req.token = cookie; //to store the cookie of the current user

        next();
    } catch (error) {
        res.render("index", {
            loggedIn: false
        });
    }
}

const info = async (req, res, next) => {
    try {
        const id = req.params.id;
        const space = await Space.findOne({ _id: id });
        let pdfArr = [];
        let imgArr = [];
        let vidArr = [];
        let otherArr = [];
        space.files.forEach((file) => {
            if (file.fileType === "pdf")
                pdfArr.unshift(file);
            else if (file.fileType === "jpg" || file.fileType === "png" || file.fileType === "jpeg")
                imgArr.unshift(file);
            else if (file.fileType === "mp4" || file.fileType === "mov")
                vidArr.unshift(file);
            else
                otherArr.unshift(file);
        })
        let spaceArr = [];
        let announceLength = space.announcements.length;
        space.announcements.forEach((item) => {
            let obj = {
                number: announceLength--,
                ann: item.announcement
            }
            spaceArr.unshift(obj);
        });
        req.pdfArr = pdfArr; //Array of PDFs
        req.imgArr = imgArr; //Array of Images
        req.vidArr = vidArr; //Array of Videos
        req.otherArr = otherArr; //Array of Other Files
        req.spaceArr = spaceArr; //Array of Announcements
        next();
    }
    catch (err) {
        res.send(err);
        console.log(err);
    }
}

module.exports = { auth,info };
