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

// Test student login
const testStudentLogin = async () => {
  try {
    await connectDB();
    
    const autonomousRollNo = "03NAC25001";
    const dob = "01-01-2005"; // Default DOB
    
    console.log(`\n🔍 Testing login for: ${autonomousRollNo}\n`);
    
    // Test queries exactly as in auth.js
    const [ugFirstSem2025, pgFirstSem2025] = await Promise.all([
      UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
    ]);
    
    console.log('📋 Query Results:');
    console.log(`   UGFirstSem2025 found: ${ugFirstSem2025 ? '✅ YES' : '❌ NO'}`);
    console.log(`   PGFirstSem2025 found: ${pgFirstSem2025 ? '✅ YES' : '❌ NO'}`);
    
    if (ugFirstSem2025) {
      console.log('\n📋 UGFirstSem2025 Student Details:');
      console.log(`   Autonomous Roll No: "${ugFirstSem2025["Autonomous Roll No"]}"`);
      console.log(`   Name: "${ugFirstSem2025["Applicant Name"]}"`);
      console.log(`   dob: "${ugFirstSem2025.dob}"`);
      console.log(`   dob type: ${typeof ugFirstSem2025.dob}`);
      console.log(`   dob === "${dob}": ${ugFirstSem2025.dob === dob}`);
      console.log(`   All fields:`, Object.keys(ugFirstSem2025.toObject()));
    }
    
    if (pgFirstSem2025) {
      console.log('\n📋 PGFirstSem2025 Student Details:');
      console.log(`   Autonomous Roll No: "${pgFirstSem2025["Autonomous Roll No"]}"`);
      console.log(`   Name: "${pgFirstSem2025["Name of the Students"]}"`);
      console.log(`   dob: "${pgFirstSem2025.dob}"`);
      console.log(`   dob type: ${typeof pgFirstSem2025.dob}`);
    }
    
    // Test with different DOB values
    console.log('\n🧪 Testing with different DOB values:');
    const testDOBs = ["01-01-2005", "1-1-2005", "01/01/2005", "2005-01-01"];
    
    for (const testDob of testDOBs) {
      const found = await UGFirstSem2025.findOne({ 
        "Autonomous Roll No": autonomousRollNo,
        dob: testDob
      });
      console.log(`   DOB "${testDob}": ${found ? '✅ MATCH' : '❌ NO MATCH'}`);
    }
    
    // Check collection name
    console.log('\n📊 Collection Info:');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const firstsemCollections = collections.filter(c => c.name.includes('firstsem2025'));
    console.log(`   Collections: ${firstsemCollections.map(c => c.name).join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  testStudentLogin();
}

module.exports = { testStudentLogin };

