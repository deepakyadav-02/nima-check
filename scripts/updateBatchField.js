const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI not found in environment variables');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Update batch field for existing records
const updateBatchField = async () => {
  try {
    await connectDB();
    
    console.log('\n🔄 Updating batch field for existing records...\n');
    
    // Update UG First Sem 2025
    const ugResult = await UGFirstSem2025.updateMany(
      { batch: { $exists: false } },
      { $set: { batch: "2025" } }
    );
    console.log(`✅ Updated ${ugResult.modifiedCount} UG First Sem 2025 records`);
    
    // Update PG First Sem 2025
    const pgResult = await PGFirstSem2025.updateMany(
      { batch: { $exists: false } },
      { $set: { batch: "2025" } }
    );
    console.log(`✅ Updated ${pgResult.modifiedCount} PG First Sem 2025 records`);
    
    // Verify
    const ugCount = await UGFirstSem2025.countDocuments({ batch: "2025" });
    const pgCount = await PGFirstSem2025.countDocuments({ batch: "2025" });
    
    console.log('\n📊 Verification:');
    console.log(`   UG First Sem 2025 with batch="2025": ${ugCount}`);
    console.log(`   PG First Sem 2025 with batch="2025": ${pgCount}`);
    
    console.log('\n✅ Batch field update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  updateBatchField();
}

module.exports = { updateBatchField };

