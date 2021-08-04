require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { auth, info } = require("./middleware.js");

require("../db/conn.js"); //connecting to mongodb

const Contact = require("../db/contact.js"); //access to the Contact model
const User = require("../db/register.js"); //access to the Registration model
const Space = require("../db/spaces.js"); //access to the Spaces model

const port = process.env.PORT || 3000;

const staticPath = path.join(__dirname, "../public"); //path to static folder
const templatePath = path.join(__dirname, "../templates/views"); //path to main hbs files
const partialsPath = path.join(__dirname, "../templates/partials"); //path to partials files

app.set("view engine", "hbs");
app.set("views", templatePath);
hbs.registerPartials(partialsPath);

app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let storage = multer.diskStorage({
    destination: ((req, file, cb) => {
        cb(null, "public/uploads/")
    }),
    filename: ((req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    })
})

let upload = multer({
    storage: storage,
    limit: { fileSize: 1000000 * 100 } //100 MB
}).single("file");

var loggedOut = true, loggedIn = false;
var contactsubmit = false;

app.get('/', auth, (req, res) => {
    res.render("index", {
        // loggedOut: false,
        loggedInNow: true,
        loggedIn: true,
        fname: req.currentUser.firstname,
        lname: req.currentUser.lastname
    });
})

app.get('/main', auth, (req, res) => {
    let spaceArr = [];
    req.currentUser.spaces.forEach(async (item) => {
        try {
            const temp = await Space.findOne({ _id: item.space });
            // console.log(temp);
            spaceArr.push(temp);
            // console.log(spaceArr);
        } catch (error) {
            console.log(error);
        }
    });
    // console.log(spaceArr);
    res.render("main", {
        loggedIn: true,
        classes: spaceArr
    });
    // res.render("main");
})

app.post("/register", async (req, res) => { //registering user
    try {
        // console.log(req.body);
        const password = req.body.password;
        const confirmpassword = req.body.confirmpassword;
        if (password === confirmpassword) {
            const userData = new User(req.body);
            const token = await userData.generateToken(); //generating jwt token
            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 600000)
            });
            await userData.save();
            res.status(200).render("index", {
                loggedIn: true,
                // loggedOut: !userData.isLoggedIn,
                loggedInNow: true,
                fname: req.body.firstname,
                lname: req.body.lastname
            });
        }
        else
            res.send("Passwords are not matching");
    } catch (error) {
        res.status(500).send(error);
    }
})

app.post("/login", async (req, res) => { //sign in feature
    try {
        const email = req.body.email;
        const password = req.body.password;

        const user = await User.findOne({ email: email });
        user.isLoggedIn = true;
        // console.log(user);

        const token = await user.generateToken();
        // console.log(token);
        res.cookie("jwt", token, {
            expires: new Date(Date.now() + 6000000)
        });

        if (user.password === password) {
            res.status(200).render("index", {
                loggedIn: user.isLoggedIn,
                // loggedOut: !user.isLoggedIn,
                loggedInNow: true,
                fname: user.firstname,
                lname: user.lastname
            });
        }
        else
            res.send("Invalid Credentials");
    }
    catch (error) {
        res.status(400).send("Invalid Credentials");
    }
})

app.get("/logout", auth, async (req, res) => {
    try {
        req.currentUser.tokens = req.currentUser.tokens.filter((currentToken) => {
            return currentToken.token !== req.token;
        });
        req.currentUser.isLoggedIn = false;

        res.clearCookie("jwt");

        await req.currentUser.save();
        res.render("index", {
            loggedIn: req.currentUser.isLoggedIn,
            loggedOut: !req.currentUser.isLoggedIn
        })
    } catch (error) {
        res.status(500).send(error);
    }
})

app.post("/contact", auth, async (req, res) => { //submitting contact form
    try {
        // console.log(req.body);
        const contactData = new Contact(req.body);
        await contactData.save();
        contactsubmit = true;
        res.render("index", {
            contactsubmit: true,
            loggedIn: req.currentUser.isLoggedIn
        });
    } catch (error) {
        res.status(500).send(error);
    }
})

app.post("/createClass", auth, async (req, res) => {
    try {
        const spaceData = new Space(req.body);
        const currentSpace = await spaceData.save();
        console.log(currentSpace._id);
        req.currentUser.spaces = req.currentUser.spaces.concat({ space: currentSpace._id });
        await req.currentUser.save();
        let spaceArr = [];
        req.currentUser.spaces.forEach(async (item) => {
            try {
                const temp = await Space.findOne({ _id: item.space });
                // console.log(temp);
                spaceArr.push(temp);
                // console.log(spaceArr);
            } catch (error) {
                console.log(error);
            }
        });
        res.render("main", {
            loggedIn: true,
            classcreate: true,
            classes: spaceArr
        });
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
});

app.post("/joinClass", auth, async (req, res) => {
    try {
        const uid = req.body.uniqueId;
        const password = req.body.joinPassword;
        const user = await Space.findOne({ _id: uid });
        if (user.password === password) {
            req.currentUser.spaces = req.currentUser.spaces.concat({ space: uid });
            await req.currentUser.save();
            let spaceArr = [];
            req.currentUser.spaces.forEach(async (item) => {
                try {
                    const temp = await Space.findOne({ _id: item.space });
                    // console.log(temp);
                    spaceArr.push(temp);
                    // console.log(spaceArr);
                } catch (error) {
                    console.log(error);
                }
            });
            res.render("main", {
                loggedIn: true,
                classcreate: true,
                classes: spaceArr
            });
        }
        else
            res.send("Invalid Credentials");
    } catch (error) {
        res.status(400).send("Invalid Credentials");
        console.log(error);
    }
});

app.get("/main/:id", [auth, info], async (req, res) => {
    try {
        res.render("content", {
            loggedIn: true,
            uid: req.params.id,
            announce: req.spaceArr,
            pdfArr: req.pdfArr,
            imgArr: req.imgArr,
            vidArr: req.vidArr,
            otherArr: req.otherArr,
        });
    }
    catch (error) {
        res.status(500).send(error);
    }
});

app.post("/announce/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        const space = await Space.findOne({ _id: id });
        // console.log(space);
        space.announcements = space.announcements.concat({ announcement: req.body.announcement });
        await space.save();
        let n = space.announcements.length;
        if (n > 10) {
            while (n > 10) {
                space.announcements.shift();
                n--;
            }
        }
        await space.save();
        res.render("content", {
            loggedIn: true,
            uid: req.params.id,
            announce: req.spaceArr,
            pdfArr: req.pdfArr,
            imgArr: req.imgArr,
            vidArr: req.vidArr,
            otherArr: req.otherArr,
            createAnnounce: true
        });
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
});

app.post("/remove/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        const space = await Space.findOne({ _id: id });
        // console.log(space);
        let n = space.announcements.length;
        let input = req.body.announcement;
        // console.log(input)
        if (input >= 1 && input <= n) {
            let cnt = 0;
            space.announcements = space.announcements.filter((item) => {
                // cnt++;
                if ((cnt++) !== (n - input)) {
                    // console.log(item.announcement);
                    // console.log(cnt);
                    return item.announcement;
                }
            });
            await space.save();
            res.render("content", {
                loggedIn: true,
                uid: req.params.id,
                announce: req.spaceArr,
                pdfArr: req.pdfArr,
                imgArr: req.imgArr,
                vidArr: req.vidArr,
                otherArr: req.otherArr,
                removeAnnounce: true
            });
        }
        else {
            res.render("content", {
                loggedIn: true,
                uid: req.params.id,
                announce: req.spaceArr,
                pdfArr: req.pdfArr,
                imgArr: req.imgArr,
                vidArr: req.vidArr,
                otherArr: req.otherArr,
                invalid: true
            });
        }
        // let n = space.announcements.length;
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
});

app.post('/file/:id', [auth, info], (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err) {
                res.status(500).send(err);
                console.log(err);
            }
            else {
                const id = req.params.id;
                const space = await Space.findOne({ _id: id });
                const filetype = path.extname(req.file.filename).slice(1);
                let size = Math.round(req.file.size / 1024);
                if (size >= 1024) {
                    size = Math.round(size / 1024) + " MB";
                }
                else
                    size += " KB"
                space.files = space.files.concat({
                    fileName: req.file.filename,
                    path: req.file.path.slice(6),
                    size,
                    fileType: filetype.toLowerCase(),
                    displayName: req.body.displayName,
                });
                await space.save();
                console.log("File Added Successfully");
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: req.pdfArr,
                    imgArr: req.imgArr,
                    vidArr: req.vidArr,
                    otherArr: req.otherArr,
                    fileAdded: true
                });
            }
        }
        catch (err) {
            res.status(500).send(err);
            console.log(err);
        }
    });
});


app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})