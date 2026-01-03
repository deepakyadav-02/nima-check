const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
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

// Test auth priority logic
const testAuthPriority = async () => {
  try {
    await connectDB();
    
    const autonomousRollNo = "03NAC25001";
    const dob = "01-01-2005";
    
    console.log(`\n🔍 Testing auth priority for: ${autonomousRollNo}\n`);
    
    // Check in all five models exactly as in auth.js
    const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo, dob: dob }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo, "DOB": dob }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo, dob: dob }),
      UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
    ]);
    
    console.log('📋 Query Results:');
    console.log(`   UGStudent: ${ugStudent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   PGStudent: ${pgStudent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   BBAStudent: ${bbaStudent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   UGFirstSem2025: ${ugFirstSem2025 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   PGFirstSem2025: ${pgFirstSem2025 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Apply priority logic exactly as in auth.js
    let student = null;
    let studentType = null;
    
    console.log('\n🔀 Applying Priority Logic:');
    console.log('   Priority: BBA > PG > PGFirstSem2025 > UG > UGFirstSem2025\n');
    
    if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
      student = bbaStudent;
      studentType = 'BBA';
      console.log('   ✅ Selected: BBA');
    } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
      student = pgStudent;
      studentType = 'PG';
      console.log('   ✅ Selected: PG');
    } else if (pgFirstSem2025) {
      student = pgFirstSem2025;
      studentType = 'PG2025';
      console.log('   ✅ Selected: PGFirstSem2025');
    } else if (ugStudent) {
      student = ugStudent;
      studentType = 'UG';
      console.log('   ✅ Selected: UG (THIS MIGHT BE THE PROBLEM!)');
    } else if (ugFirstSem2025) {
      student = ugFirstSem2025;
      studentType = 'UG2025';
      console.log('   ✅ Selected: UGFirstSem2025');
    }
    
    if (!student) {
      console.log('\n   ❌ NO STUDENT SELECTED - Login will fail!');
    } else {
      console.log(`\n✅ Final Selection:`);
      console.log(`   Type: ${studentType}`);
      console.log(`   Name: ${student["Name of the Students"] || student["Applicant Name"] || student["Name"]}`);
      console.log(`   Roll No: ${student["Autonomous Roll No"]}`);
    }
    
    // Check if UGStudent has a match (this would cause the issue)
    if (ugStudent) {
      console.log('\n⚠️  WARNING: Found in UGStudent model!');
      console.log(`   This will take priority over UGFirstSem2025`);
      console.log(`   UGStudent DOB: "${ugStudent.dob}"`);
      console.log(`   Requested DOB: "${dob}"`);
      console.log(`   DOB Match: ${ugStudent.dob === dob}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  testAuthPriority();
}

module.exports = { testAuthPriority };

