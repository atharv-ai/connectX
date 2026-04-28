require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

const authantic = require("./src/routes/authRout");
app.use('/api/auth',authantic);


app.get("/",function(req,res){
    res.send("hi there");
})

mongoose.connect(MONGO_URI)
.then(()=>{
    console.log("server connected");
    app.listen(PORT,()=>{
        console.log("DB Cinnected Successfully");
    });
})
.catch((err)=>{
    console.log(err);
})

