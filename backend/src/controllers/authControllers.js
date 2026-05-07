const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");
require("dotenv").config();

const signup = async function (req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }
        const existingUser = await User.findOne({
            email: String(email).trim().toLowerCase(),
        });
        if (existingUser) {
            return res.status(400).json({ message: "That email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const emailNormalized = String(email).trim().toLowerCase();

        await User.create({
            name: String(name).trim(),
            email: emailNormalized,
            password: hashedPassword,
        });

        res.status(200).json({ message: "Account created successfully." });
    } catch (error) {
        console.error("[signup]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};

const signin = async function (req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const user = await User.findOne({
            email: String(email).trim().toLowerCase(),
        });
        if (!user) {
            return res.status(404).json({ message: "No account found for this email." });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ message: "Incorrect password." });
        }
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("[signin]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};

module.exports = { signup, signin };
