const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

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
    return conn.connection.db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Check and clean collections
const checkAndClean = async () => {
  try {
    const db = await connectDB();
    
    console.log('\n🔍 Checking collections...\n');

    // Get all collections
    const allCollections = await db.listCollections().toArray();
    const firstsemCollections = allCollections
      .filter(c => c.name.includes('firstsem2025'))
      .map(c => c.name)
      .sort();
    
    console.log('📊 Found collections:');
    for (const collName of firstsemCollections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`   ${collName}: ${count} documents`);
    }
    
    // Collections we want to keep (without 's')
    const targetCollections = ['ugfirstsem2025', 'pgfirstsem2025'];
    const collectionsToDrop = firstsemCollections.filter(c => !targetCollections.includes(c));
    
    if (collectionsToDrop.length > 0) {
      console.log('\n🗑️  Dropping old collections:');
      for (const collName of collectionsToDrop) {
        const count = await db.collection(collName).countDocuments();
        console.log(`   Dropping ${collName} (${count} documents)...`);
        await db.collection(collName).drop();
        console.log(`   ✅ Dropped ${collName}`);
      }
    } else {
      console.log('\n✅ No duplicate collections to clean up');
    }
    
    // Final status
    console.log('\n' + '='.repeat(70));
    console.log('📊 Final collection status:');
    const finalCollections = await db.listCollections().toArray();
    const finalFirstsem = finalCollections
      .filter(c => c.name.includes('firstsem2025'))
      .map(c => c.name)
      .sort();
    
    for (const collName of finalFirstsem) {
      const count = await db.collection(collName).countDocuments();
      console.log(`   ${collName}: ${count} documents`);
    }
    console.log('='.repeat(70));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  checkAndClean();
}

module.exports = { checkAndClean };

