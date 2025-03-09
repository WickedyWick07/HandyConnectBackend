const mongoose = require("mongoose");

const UserSettingsSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    language: { type: String, default: "en" },
    region: { type: String, default: "UTC" },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    email_notifications: { type: Boolean, default: false },
    push_notifications: { type: Boolean, default: false }
});

const UserSettings = mongoose.model("UserSettings", UserSettingsSchema);
module.exports = UserSettings;
