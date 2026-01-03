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

// Rename collections from with 's' to without 's'
const renameCollections = async () => {
  try {
    const db = await connectDB();
    
    console.log('\n🔄 Starting collection rename...\n');

    // Collections to rename
    const collectionsToRename = [
      { old: 'ugfirstsem2025s', new: 'ugfirstsem2025' },
      { old: 'pgfirstsem2025s', new: 'pgfirstsem2025' }
    ];

    for (const { old: oldCollection, new: newCollection } of collectionsToRename) {
      console.log(`📋 Processing ${oldCollection} → ${newCollection}...`);
      
      const oldExists = await db.listCollections({ name: oldCollection }).hasNext();
      const newExists = await db.listCollections({ name: newCollection }).hasNext();
      
      if (oldExists && newExists) {
        // Both exist - check if new is empty, then rename or merge
        const oldCount = await db.collection(oldCollection).countDocuments();
        const newCount = await db.collection(newCollection).countDocuments();
        
        console.log(`   ⚠️  Both collections exist:`);
        console.log(`      ${oldCollection}: ${oldCount} documents`);
        console.log(`      ${newCollection}: ${newCount} documents`);
        
        if (newCount === 0 && oldCount > 0) {
          // New collection is empty, just drop it and rename old
          console.log(`   🗑️  Dropping empty new collection...`);
          await db.collection(newCollection).drop();
          console.log(`   🔄 Renaming ${oldCollection} to ${newCollection}...`);
          await db.collection(oldCollection).rename(newCollection);
          console.log(`   ✅ Renamed successfully`);
        } else if (oldCount > 0) {
          // Both have data - merge and drop old
          const oldDocs = await db.collection(oldCollection).find({}).toArray();
          
          // Check for duplicates and merge
          let merged = 0;
          let skipped = 0;
          
          for (const doc of oldDocs) {
            // Check if document already exists in new collection (by Autonomous Roll No)
            const existing = await db.collection(newCollection).findOne({
              "Autonomous Roll No": doc["Autonomous Roll No"]
            });
            
            if (!existing) {
              // Insert into new collection
              await db.collection(newCollection).insertOne(doc);
              merged++;
            } else {
              skipped++;
            }
          }
          
          console.log(`   ✅ Merged ${merged} documents, skipped ${skipped} duplicates`);
          
          // Drop old collection
          await db.collection(oldCollection).drop();
          console.log(`   🗑️  Dropped old collection: ${oldCollection}`);
        } else {
          // Old is empty, just drop it
          await db.collection(oldCollection).drop();
          console.log(`   🗑️  Dropped empty old collection: ${oldCollection}`);
        }
        
      } else if (oldExists && !newExists) {
        // Only old exists - rename it
        const oldCount = await db.collection(oldCollection).countDocuments();
        console.log(`   📦 Old collection exists with ${oldCount} documents`);
        console.log(`   🔄 Renaming ${oldCollection} to ${newCollection}...`);
        
        await db.collection(oldCollection).rename(newCollection);
        console.log(`   ✅ Renamed successfully`);
        
      } else if (!oldExists && newExists) {
        // Only new exists - nothing to do
        const newCount = await db.collection(newCollection).countDocuments();
        console.log(`   ✅ New collection already exists with ${newCount} documents - no action needed`);
        
      } else {
        // Neither exists
        console.log(`   ℹ️  Neither collection exists - no action needed`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Collection rename completed!');
    console.log('='.repeat(70));
    
    // List final collections
    console.log('\n📊 Final collection status:');
    const allCollections = await db.listCollections().toArray();
    const relevantCollections = allCollections
      .filter(c => c.name.includes('firstsem2025'))
      .map(c => c.name)
      .sort();
    
    for (const collName of relevantCollections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`   ${collName}: ${count} documents`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during rename:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the rename
if (require.main === module) {
  renameCollections();
}

module.exports = { renameCollections };

