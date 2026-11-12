const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Product = require("./models/Product");
const Inquiry = require("./models/Inquiry");
const Contact = require("./models/Contact");
const { productsData, companyInfo } = require("./seedData");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// In-memory fallback stores for high availability
let inMemoryInquiries = [];
let inMemoryContacts = [];
let isDbConnected = false;

// Connect to MongoDB Atlas
async function connectDB() {
  const uri = process.env.REPLICA_MONGO_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️ No MONGO_URI provided. Running in high-availability memory mode.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isDbConnected = true;
    console.log("✅ Successfully connected to MongoDB Atlas (orvik_db)!");

    // Check if products need seeding
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("🌱 Seeding database with 10 Orvik Life Sciences products...");
      await Product.insertMany(productsData);
      console.log("✅ Database successfully seeded!");
    } else {
      console.log(`📦 Found ${count} existing products in MongoDB Atlas.`);
    }
  } catch (err) {
    console.warn("⚠️ MongoDB Atlas connection notice:", err.message);
    console.log("ℹ️ Server running in resilient in-memory mode.");
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
}

// Keep event loop alive
setInterval(() => {}, 60000);

// Routes

// 1. Health & Database Status
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    company: "ORVIK LIFE SCIENCES PVT. LTD.",
    database: isDbConnected ? "MongoDB Atlas Connected" : "In-Memory Fallback Active",
    productsCount: productsData.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Company Information & Three Pillars
app.get("/api/company", (req, res) => {
  res.json({ success: true, data: companyInfo });
});

// 3. Products List with Rich Filters
app.get("/api/products", async (req, res) => {
  try {
    const { species, category, search, pillar, featured, bestseller } = req.query;

    if (isDbConnected) {
      let filter = {};
      if (species) filter.targetSpecies = { $regex: new RegExp(species, "i") };
      if (category) filter.category = category;
      if (pillar) filter.threePillarCategory = pillar;
      if (featured === "true") filter.isFeatured = true;
      if (bestseller === "true") filter.isBestseller = true;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { tagline: { $regex: search, $options: "i" } },
          { hindiTitle: { $regex: search, $options: "i" } },
          { indications: { $regex: search, $options: "i" } },
          { "composition.ingredient": { $regex: search, $options: "i" } },
        ];
      }

      const products = await Product.find(filter).sort({ isBestseller: -1, createdAt: -1 });
      return res.json({ success: true, count: products.length, data: products });
    }

    // In-memory filter fallback
    let filtered = [...productsData];
    if (species) {
      filtered = filtered.filter((p) =>
        p.targetSpecies.some((s) => s.toLowerCase().includes(species.toLowerCase()))
      );
    }
    if (category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (pillar) {
      filtered = filtered.filter((p) => p.threePillarCategory.toLowerCase() === pillar.toLowerCase());
    }
    if (featured === "true") {
      filtered = filtered.filter((p) => p.isFeatured);
    }
    if (bestseller === "true") {
      filtered = filtered.filter((p) => p.isBestseller);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          (p.hindiTitle && p.hindiTitle.includes(q)) ||
          p.indications.some((ind) => ind.toLowerCase().includes(q)) ||
          p.composition.some((c) => c.ingredient.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Product by Slug
app.get("/api/products/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    let product;

    if (isDbConnected) {
      product = await Product.findOne({ slug });
    } else {
      product = productsData.find((p) => p.slug === slug);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Find related products in same category or pillar
    const related = productsData
      .filter((p) => p.slug !== slug && (p.category === product.category || p.threePillarCategory === product.threePillarCategory))
      .slice(0, 3);

    res.json({ success: true, data: product, related });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Categories & Species Taxonomy
app.get("/api/categories", (req, res) => {
  const categories = [
    "Calcium & Mineral Supplements",
    "Fertility & Uterine Care",
    "Liver & Metabolic Health",
    "Nervine & Neurological Tonics",
    "Rumen Digestion & Probiotics",
    "Udder Health & Mastitis Care",
    "Anti-Toxin & Poisoning Suspensions",
  ];

  const speciesList = ["Cattle", "Buffalo", "Calves", "Heifers", "Sheep", "Goat", "Poultry", "Horse", "Dog / Pet"];

  const counts = categories.map((cat) => ({
    name: cat,
    count: productsData.filter((p) => p.category === cat).length,
  }));

  res.json({
    success: true,
    categories: counts,
    species: speciesList,
  });
});

// 6. Inquiries API (Distributor / Vet / Farm bulk inquiry)
app.post("/api/inquiries", async (req, res) => {
  try {
    const { name, email, phone, organization, city, state, inquiryType, productOfInterest, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ success: false, message: "Name, phone and message are required." });
    }

    const newInquiry = {
      name,
      email: email || "Not provided",
      phone,
      organization: organization || "",
      city: city || "",
      state: state || "",
      inquiryType: inquiryType || "Distributor / Dealership",
      productOfInterest: productOfInterest || "All Products",
      message,
      status: "New",
      createdAt: new Date(),
    };

    if (isDbConnected) {
      const saved = await Inquiry.create(newInquiry);
      return res.status(201).json({ success: true, message: "Inquiry submitted successfully to MongoDB Atlas!", data: saved });
    }

    inMemoryInquiries.unshift({ id: `INQ-${Date.now()}`, ...newInquiry });
    res.status(201).json({
      success: true,
      message: "Inquiry received and recorded successfully!",
      data: inMemoryInquiries[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/inquiries", async (req, res) => {
  try {
    if (isDbConnected) {
      const list = await Inquiry.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: list.length, data: list });
    }
    res.json({ success: true, count: inMemoryInquiries.length, data: inMemoryInquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Contact API
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ success: false, message: "Name, phone and message are required." });
    }

    const contactEntry = {
      name,
      email: email || "Not provided",
      phone,
      subject: subject || "General Inquiry",
      message,
      createdAt: new Date(),
    };

    if (isDbConnected) {
      const saved = await Contact.create(contactEntry);
      return res.status(201).json({ success: true, message: "Message sent successfully!", data: saved });
    }

    inMemoryContacts.unshift({ id: `CNT-${Date.now()}`, ...contactEntry });
    res.status(201).json({ success: true, message: "Message sent successfully!", data: inMemoryContacts[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Stats Overview (for home or admin dashboard)
app.get("/api/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      totalProducts: productsData.length,
      categoriesCount: 7,
      pillarsCount: 3,
      coveredSpecies: ["Cattle", "Buffalo", "Sheep", "Goat", "Poultry", "Horse", "Dogs & Cats"],
      satisfactionRate: "99.4%",
      distributionNetwork: "Pan-India",
      manufacturingCertifications: ["ISO 9001:2015", "GMP Certified"],
      headquarters: "Hyderabad, Telangana",
    },
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ORVIK Backend Server running on port ${PORT}`);
  connectDB();
});

