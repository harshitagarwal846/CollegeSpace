require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
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

app.get('/main', auth, async (req, res) => {
    try {
        let spaceArr = [];
        await req.currentUser.spaces.forEach(async (item) => {
            try {
                const temp = await Space.findOne({ _id: item.space });
                // console.log(temp);
                await spaceArr.push(temp);
                // console.log(spaceArr);
            } catch (error) {
                console.log(error);
            }
        });
        // console.log(spaceArr);
        setTimeout(() => {
            res.render("main", {
                loggedIn: true,
                classes: spaceArr
            });
        },1000);
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
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
            res.cookie("jwt", token);
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
        res.cookie("jwt", token);

        if (user.password === password) {
            res.status(200).render("index", {
                loggedIn: user.isLoggedIn,
                // loggedOut: !user.isLoggedIn,
                loggedInNow: true,
                fname: user.firstname,
                lname: user.lastname
            });
        }
        else {
            res.status(400).render("index", {
                loggedIn: false,
                // loggedOut: !user.isLoggedIn,
                invalid: true
            });
        }
    }
    catch (error) {
        res.status(400).render("index", {
            loggedIn: false,
            // loggedOut: !user.isLoggedIn,
            invalid: true
        });
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
        currentSpace.users = currentSpace.users.concat({
            email: req.currentUser.email,
            admin: true
        });
        await currentSpace.save();
        console.log(currentSpace._id);
        req.currentUser.spaces = req.currentUser.spaces.concat({
            space: currentSpace._id,
            admin: true
        });
        await req.currentUser.save();
        let spaceArr = [];
        await req.currentUser.spaces.forEach(async (item) => {
            try {
                const temp = await Space.findOne({ _id: item.space });
                console.log(temp);
                await spaceArr.push(temp);
                // console.log(spaceArr);
            } catch (error) {
                console.log(error);
            }
        });
        setTimeout(() => {
            res.render("main", {
                loggedIn: true,
                classes: spaceArr,
                success: true,
                msg: "Class created successfully."
            });
        },1000);
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
            req.currentUser.spaces = req.currentUser.spaces.concat({
                space: uid,
                admin: false
            });
            await req.currentUser.save();
            user.users = user.users.concat({
                email: req.currentUser.email,
                admin: false
            });
            await user.save();
            let spaceArr = [];
            req.currentUser.spaces.forEach(async (item) => {
                try {
                    const temp = await Space.findOne({ _id: item.space });
                    // console.log(temp);
                    await spaceArr.push(temp);
                    // console.log(spaceArr);
                } catch (error) {
                    console.log(error);
                }
            });
            setTimeout(() => {
                res.render("main", {
                    loggedIn: true,
                    classes: spaceArr,
                    success: true,
                    msg: "Class added successfully"
                });
            },1000);
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
            admin: req.admin,
            classInfo: req.classInfo,
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
        if (n > 15) {
            while (n > 15) {
                space.announcements.shift();
                n--;
            }
        }
        await space.save();
        let spaceArr = [];
        let announceLength = space.announcements.length;
        space.announcements.forEach(async (item) => {
            let obj = {
                number: announceLength--,
                ann: item.announcement
            }
            await spaceArr.unshift(obj);
        });
        res.render("content", {
            loggedIn: true,
            uid: req.params.id,
            announce: spaceArr,
            pdfArr: req.pdfArr,
            imgArr: req.imgArr,
            vidArr: req.vidArr,
            otherArr: req.otherArr,
            admin: req.admin,
            classInfo: req.classInfo,
            success: true,
            msg: "Announcement created successfully."
        });
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
});

app.post("/remove/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        console.log(Space);
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
            let spaceArr = [];
            let announceLength = space.announcements.length;
            space.announcements.forEach(async (item) => {
                let obj = {
                    number: announceLength--,
                    ann: item.announcement
                }
                await spaceArr.unshift(obj);
            });
            res.render("content", {
                loggedIn: true,
                uid: req.params.id,
                announce: spaceArr,
                pdfArr: req.pdfArr,
                imgArr: req.imgArr,
                vidArr: req.vidArr,
                otherArr: req.otherArr,
                admin: req.admin,
                classInfo: req.classInfo,
                success: true,
                msg: "Announcement removed successfully."
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
                admin: req.admin,
                classInfo: req.classInfo,
                danger: true,
                msg: "Invalid Input."
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
                let size = Math.ceil(req.file.size / 1024);
                if (size >= 1024) {
                    size = Math.ceil(size / 1024) + " MB";
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
                let pdfArr = [];
                let imgArr = [];
                let vidArr = [];
                let otherArr = [];
                space.files.forEach(async (file) => {
                    try {
                        if (file.fileType === "pdf")
                            await pdfArr.unshift(file);
                        else if (file.fileType === "jpg" || file.fileType === "png" || file.fileType === "jpeg")
                            await imgArr.unshift(file);
                        else if (file.fileType === "mp4" || file.fileType === "mov")
                            await vidArr.unshift(file);
                        else
                            await otherArr.unshift(file);
                    } catch (err) {
                        res.send(err);
                        console.log(err);
                    }
                })
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: pdfArr,
                    imgArr: imgArr,
                    vidArr: vidArr,
                    otherArr: otherArr,
                    admin: req.admin,
                    classInfo: req.classInfo,
                    success: true,
                    msg: "File added successfully."
                });
            }
        }
        catch (err) {
            res.status(500).send(err);
            console.log(err);
        }
    });
});

app.get("/removeFile/:id/:fileid", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        const fileid = req.params.fileid;
        console.log(id);
        console.log(fileid);
        const space = await Space.findOne({ _id: id });
        space.files = space.files.filter((file) => {
            if (file._id != fileid)
                return file;
            else {
                fs.unlink(`public${file.path}`, (err) => {
                    console.log(err);
                });
            }
        })
        await space.save();
        let pdfArr = [];
        let imgArr = [];
        let vidArr = [];
        let otherArr = [];
        space.files.forEach(async (file) => {
            if (file.fileType === "pdf")
                await pdfArr.unshift(file);
            else if (file.fileType === "jpg" || file.fileType === "png" || file.fileType === "jpeg")
                await imgArr.unshift(file);
            else if (file.fileType === "mp4" || file.fileType === "mov")
                await vidArr.unshift(file);
            else
                await otherArr.unshift(file);
        });
        console.log("File Deleted Successfully");
        res.render("content", {
            loggedIn: true,
            uid: req.params.id,
            announce: req.spaceArr,
            pdfArr: pdfArr,
            imgArr: imgArr,
            vidArr: vidArr,
            otherArr: otherArr,
            admin: req.admin,
            classInfo: req.classInfo,
        });
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
})

app.get("/removeClass/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        if (req.admin === false) {
            res.render("main", {
                loggedIn: true,
                classes: req.spaceArr
            });
        }
        else {
            const space = await Space.findOne({ _id: id });
            req.classInfo.emails.forEach(async (email) => {
                const user = await User.findOne({ email });
                user.spaces = user.spaces.filter((spaceId) => {
                    return spaceId.space !== id;
                });
                await user.save();
            });
            space.files.forEach((file) => {
                fs.unlink(`public${file.path}`, (err) => {
                    console.log(err);
                });
            })
            await Space.deleteOne({ _id: id });
            let spaceArr = [];
            await req.currentUser.spaces.forEach(async (item) => {
                try {
                    const temp = await Space.findOne({ _id: item.space });
                    // console.log(temp);
                    await spaceArr.push(temp);
                    // console.log(spaceArr);
                } catch (error) {
                    console.log(error);
                }
            });
            setTimeout(() => {
                res.render("main", {
                    loggedIn: true,
                    classes: spaceArr,
                    success: true,
                    msg: "Class removed successfully."
                });
            },1500);
        }
    }
    catch (err) {
        res.send(err);
        console.log(err);
    }
})

app.post("/makeAdmin/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        const space = await Space.findOne({ _id: id });
        const email = req.body.email;
        if (email == req.currentUser.email) {
            res.render("content", {
                loggedIn: true,
                uid: req.params.id,
                announce: req.spaceArr,
                pdfArr: req.pdfArr,
                imgArr: req.imgArr,
                vidArr: req.vidArr,
                otherArr: req.otherArr,
                admin: req.admin,
                classInfo: req.classInfo,
                primary: true,
                msg: "One cannot change the admin status of oneself.",
            });
        }
        else {
            let flag = 0;
            space.users.forEach((user) => {
                if (user.email == email) {
                    user.admin = true;
                    flag = 1;
                }
            });
            await space.save();
            if (flag === 0) {
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: req.pdfArr,
                    imgArr: req.imgArr,
                    vidArr: req.vidArr,
                    otherArr: req.otherArr,
                    admin: req.admin,
                    classInfo: req.classInfo,
                    primary: true,
                    msg: "No such user exists in the class.",
                });
            }
            else if (flag === 1) {
                const adminUser = await User.findOne({ email });
                adminUser.spaces.forEach((spaceId) => {
                    if (spaceId.space === id)
                        spaceId.admin = true;
                });
                await adminUser.save();
                let emailArr = [];
                let adminArr = [];
                space.users.forEach(async (user) => {
                    await emailArr.push(user.email);
                    if (user.admin === true)
                        await adminArr.push(user.email);
                })
                let obj = {
                    classId: space._id,
                    className: space.name,
                    desc: space.description,
                    emails: emailArr,
                    admins: adminArr
                }
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: req.pdfArr,
                    imgArr: req.imgArr,
                    vidArr: req.vidArr,
                    otherArr: req.otherArr,
                    admin: req.admin,
                    classInfo: obj,
                    success: true,
                    msg: "Admin Status Changed Successfully.",
                });
            }
        }
    }
    catch (err) {
        res.send(err);
        console.log(err);
    }
});

app.post("/removeAdmin/:id", [auth, info], async (req, res) => {
    try {
        const id = req.params.id;
        const space = await Space.findOne({ _id: id });
        const email = req.body.email;
        if (email == req.currentUser.email) {
            res.render("content", {
                loggedIn: true,
                uid: req.params.id,
                announce: req.spaceArr,
                pdfArr: req.pdfArr,
                imgArr: req.imgArr,
                vidArr: req.vidArr,
                otherArr: req.otherArr,
                admin: req.admin,
                classInfo: req.classInfo,
                primary: true,
                msg: "One cannot change the admin status of oneself.",
            });
        }
        else {
            let flag = 0;
            space.users.forEach((user) => {
                if (user.email == email) {
                    user.admin = false;
                    flag = 1;
                }
            });
            await space.save();
            if (flag == 0) {
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: req.pdfArr,
                    imgArr: req.imgArr,
                    vidArr: req.vidArr,
                    otherArr: req.otherArr,
                    admin: req.admin,
                    classInfo: req.classInfo,
                    primary: true,
                    msg: "No such user exists in the class.",
                });
            }
            else {
                const adminUser = await User.findOne({ email });
                adminUser.spaces.forEach((spaceId) => {
                    if (spaceId.space === id)
                        spaceId.admin = false;
                });
                await adminUser.save();
                let emailArr = [];
                let adminArr = [];
                space.users.forEach(async (user) => {
                    await emailArr.push(user.email);
                    if (user.admin === true)
                        await adminArr.push(user.email);
                })
                let obj = {
                    classId: space._id,
                    className: space.name,
                    desc: space.description,
                    emails: emailArr,
                    admins: adminArr
                }
                res.render("content", {
                    loggedIn: true,
                    uid: req.params.id,
                    announce: req.spaceArr,
                    pdfArr: req.pdfArr,
                    imgArr: req.imgArr,
                    vidArr: req.vidArr,
                    otherArr: req.otherArr,
                    admin: req.admin,
                    classInfo: obj,
                    success: true,
                    msg: "Admin Status Changed Successfully.",
                });
            }
        }
    }
    catch (err) {
        res.send(err);
        console.log(err);
    }
});


app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})