const mongoose = require("mongoose");

const MONGO_URI = "mongodb://rahulbhardwaz2k1_db_user:jbAdcQFeNWQGQJSm@ac-fpsazle-shard-00-00.1fqgjr4.mongodb.net:27017,ac-fpsazle-shard-00-01.1fqgjr4.mongodb.net:27017,ac-fpsazle-shard-00-02.1fqgjr4.mongodb.net:27017/orvik_db?ssl=true&replicaSet=atlas-sm9wum-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    console.log("Connecting using standard replica set connection string...");
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000
    });
    console.log("SUCCESS! MongoDB Atlas Connected to orvik_db!");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));
    process.exit(0);
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err.message);
    process.exit(1);
  }
}

run();
