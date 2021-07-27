const mongoose=require('mongoose');

mongoose.connect("mongodb://localhost:27017/CollegeSpace",{
    useNewUrlParser:true,
    useCreateIndex:true,
    useUnifiedTopology:true
}).then(()=>{
    console.log("Success");
}).catch((err)=>{
    console.log(err);
});