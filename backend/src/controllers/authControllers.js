const User = require("../model/User")
const bcrypt = require("bcrypt");

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

module.exports = {signup};
