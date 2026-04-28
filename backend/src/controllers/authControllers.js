const jwt = require("jsonwebtoken");
const User = require("../model/User")
const bcrypt = require("bcrypt");
require("dotenv").config();

const signup =  async function(req,res){
    try{
        const {name,email,password} = req.body;

    if(!name || !email || !password){
        return res.status(400).json({message: "All filed are required"});
    }
    const existingUser = await User.findOne({email});
    if(existingUser){
        return res.status(400).json({message: "email has already been taken"});
    }

    const hashedPassword = await bcrypt.hash(password,10);
    
    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    res.status(200).json({message: "user has signed up successfully"});
    }
    catch(error){
        res.status(500).json({message: error.message});
    }

};

const signin = async function(req,res){
    try{
        const {email,password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({email});
    if(!user){
        return res.status(404).json({message: "user not found"});
    }
    const isValid = await bcrypt.compare(password,user.password);
    if(!isValid){
        return res.status(400).json({message: "password is incorrect"});
    }
    const token = jwt.sign(
        {userID: user._id},
        process.env.JWT_SECRET,
        {expiresIn: "7d"}
    );

    return res.status(201).json({message: "login succesffuly",
        token
    });
    }
    
    catch (error) {
        res.status(500).json({ message: error.message });
    }
    
}

module.exports = {signup,signin};
