const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, default: "General Contact" },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["Unread", "Read", "Responded"],
      default: "Unread",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);

