const jwt=require("jsonwebtoken");
const User = require("../db/register.js");

//middleware for authenticating the cookies
const auth = async (req, res, next) => {
    try {
        const cookie = req.cookies.jwt;
        const user = jwt.verify(cookie, process.env.SECRET_KEY);
        // console.log(user);
        const currentUser = await User.findOne({ _id: user._id });
        // console.log(currentUser.firstname);

        req.currentUser=currentUser; //to store the details of the current user
        req.token=cookie; //to store the cookie of the current user

        next();
    } catch (error) {
        res.render("index", {
            loggedIn: false
        });
    }
}

module.exports = {auth};
