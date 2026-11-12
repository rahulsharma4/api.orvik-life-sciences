const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tagline: { type: String, required: true },
    hindiTitle: { type: String },
    subtitle: { type: String },
    category: {
      type: String,
      required: true,
      enum: [
        "Calcium & Mineral Supplements",
        "Fertility & Uterine Care",
        "Liver & Metabolic Health",
        "Nervine & Neurological Tonics",
        "Rumen Digestion & Probiotics",
        "Udder Health & Mastitis Care",
        "Anti-Toxin & Poisoning Suspensions",
      ],
    },
    targetSpecies: [{ type: String }], // Cattle, Buffalo, Horse, Sheep, Goat, Poultry, Dog/Pet, Swine/Pig
    formulation: {
      type: String,
      enum: ["Liquid Tonic", "Powder / Granules", "High Potency Gel", "Oral Suspension", "Pellets"],
      default: "Liquid Tonic",
    },
    composition: [
      {
        ingredient: { type: String, required: true },
        amount: { type: String, required: true },
      },
    ],
    compositionBase: { type: String }, // e.g. "Each 100 ml contains", "Each 1kg provides", "Each 5gm provides"
    indications: [{ type: String }],
    features: [{ type: String }],
    dosages: [
      {
        species: { type: String, required: true },
        dosage: { type: String, required: true },
      },
    ],
    usageRecommendation: { type: String },
    storage: { type: String, default: "Store in cool, dry and dark place." },
    packaging: [{ type: String }],
    bannerColor: { type: String, default: "#0284c7" },
    accentColor: { type: String, default: "#38bdf8" },
    image: { type: String },
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    threePillarCategory: {
      type: String,
      enum: ["Calf a Year", "Peak Milk Production", "Smooth Transition & Cow Health", "General Health"],
      default: "General Health",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);

