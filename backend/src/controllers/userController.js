const User = require("../models/User");

const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } })
            .select("_id name email avatar status")
            .lean();

        res.status(200).json({ users });
    } catch (error) {
        console.error("[getUsers]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};

module.exports = { getUsers };
