const mongoose=require("mongoose");

const spaceSchema=mongoose.Schema({
    name:{
        type:"string",
        required:true
    },
    password:{
        type:"string",
        required:true
    },
    description:{
        type:"string",
        default:""
    }
})

const Space = new mongoose.model("Space",spaceSchema);

module.exports=Space;