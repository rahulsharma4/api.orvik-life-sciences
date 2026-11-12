const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    organization: { type: String },
    city: { type: String },
    state: { type: String },
    inquiryType: {
      type: String,
      enum: ["Distributor / Dealership", "Veterinarian Partnership", "Dairy Farm Bulk Order", "Retailer / Chemist", "Product Query", "General Inquiry"],
      default: "Distributor / Dealership",
    },
    productOfInterest: { type: String },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["New", "In Review", "Contacted", "Closed"],
      default: "New",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);

