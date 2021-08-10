const mongoose=require('mongoose');

mongoose.connect(process.env.DATABASE_URI || "mongodb://localhost:27017/CollegeSpace",{
    useNewUrlParser:true,
    useCreateIndex:true,
    useUnifiedTopology:true
}).then(()=>{
    console.log("Success");
}).catch((err)=>{
    console.log(err);
});