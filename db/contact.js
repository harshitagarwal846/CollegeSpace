const mongoose = require('mongoose');
const validator = require('validator');

const contactSchema = mongoose.Schema({
    email:{
        type:String,
        required:true,
        validate(value){
            if(!validator.isEmail(value))
            throw new Error("The email is badly formatted");
        }
    },
    category:{
        type:String,
        required:true
    },
    area:{
        type:String,
        required:true
    },
    comment:{
        type:String,
        trim:true,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    }
})

const Contact = new mongoose.model("Contact",contactSchema);

module.exports = Contact;