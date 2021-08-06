const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require("jsonwebtoken");

const regSchema = mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String
    },
    email: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isEmail(value))
                throw new Error("The email is badly formatted");
        },
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    confirmpassword: {
        type: String,
        required: true
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    spaces: [{
        space: {
            type: String
        },
        admin: {
            type: Boolean
        }
    }],
    isLoggedIn:{
        type:Boolean,
        default: true
    }
});

regSchema.methods.generateToken = async function () {
    try {
        const gentoken = jwt.sign({ _id: this._id.toString() }, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({ token: gentoken });
        await this.save();
        return gentoken;
    } catch (err) {
        res.send(err);
        console.log(err);
    }
}

const User = new mongoose.model("User", regSchema);

module.exports = User;