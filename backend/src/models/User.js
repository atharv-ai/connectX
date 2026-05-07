const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    status: {
        type: String
    }
},
{
    timestamps: true
});

const User = mongoose.model("User", userSchema);

function syncUserIndexes() {
    return User.syncIndexes().catch((err) => {
        console.error("[User] Index sync failed:", err.message);
    });
}

if (mongoose.connection.readyState === 1) {
    syncUserIndexes();
} else {
    mongoose.connection.once("connected", syncUserIndexes);
}

module.exports = User;
