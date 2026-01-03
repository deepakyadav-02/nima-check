const mongoose = require('mongoose');
const fs = require('fs');
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

// Import UG First Sem 2025 data
const importUGFirstSem2025 = async () => {
  try {
    const ugFilePath = path.join(__dirname, '../JSONS/first-year/fst-Sem(2025).json');
    console.log('📄 Reading UG First Sem 2025 data from:', ugFilePath);
    
    if (!fs.existsSync(ugFilePath)) {
      console.error('❌ Error: fst-Sem(2025).json not found at', ugFilePath);
      return { success: false, count: 0 };
    }

    const ugData = JSON.parse(fs.readFileSync(ugFilePath, 'utf8'));
    const ugStudents = ugData.students || ugData; // Handle both wrapped and unwrapped formats
    
    if (!Array.isArray(ugStudents)) {
      console.error('❌ Error: UG data is not an array');
      return { success: false, count: 0 };
    }

    console.log(`📊 Found ${ugStudents.length} UG First Sem 2025 students`);

    // Clear existing data
    await UGFirstSem2025.deleteMany({});
    console.log('🧹 Cleared existing UG First Sem 2025 data');

    // Map and insert data
    const mappedUGStudents = ugStudents.map(student => ({
      "Sl.No": student["Sl. No."] || student["Sl.No"] || null,
      "Roll No": student["Roll No"] || null,
      "Autonomous Roll No": student["Autonomous Roll No"] || null,
      "Applicant Name": student["Applicant Name"] || null,
      "CC-101": student["CC-101"] || null,
      "CC-102": student["CC-102"] || null,
      "CC-103": student["CC-103"] || null,
      "MDE-101": student["MDE-101"] || null,
      "AEC-101": student["AEC-101"] || null,
      "VAC-101": student["VAC-101"] || null,
      // Always include these fields with defaults (matching UGStudent model)
      dob: student.dob || "01-01-2005",
      ABC_ID: student.ABC_ID || null,
      profileImage: student.profileImage || null,
      batch: "2025"
    }));

    // Remove null values for cleaner documents, but keep dob, ABC_ID, and profileImage
    const cleanedUGStudents = mappedUGStudents.map(student => {
      const cleaned = {};
      Object.keys(student).forEach(key => {
        // Always include dob, ABC_ID, and profileImage even if null
        if (key === 'dob' || key === 'ABC_ID' || key === 'profileImage') {
          cleaned[key] = student[key];
        } else if (student[key] !== null && student[key] !== undefined) {
          cleaned[key] = student[key];
        }
      });
      return cleaned;
    });

    // Use native MongoDB driver for consistency
    const ugCollection = mongoose.connection.db.collection('ugfirstsem2025');
    const ugResult = await ugCollection.insertMany(cleanedUGStudents, { ordered: false });
    console.log(`✅ Imported ${ugResult.insertedCount} UG First Sem 2025 students`);

    return { success: true, count: ugResult.insertedCount };
  } catch (error) {
    console.error('❌ Error importing UG First Sem 2025:', error.message);
    return { success: false, count: 0, error: error.message };
  }
};

// Import PG First Sem 2025 data
const importPGFirstSem2025 = async () => {
  try {
    const pgFilePath = path.join(__dirname, '../JSONS/first-year/pg2025FIRSTSEM_formatted.json');
    console.log('📄 Reading PG First Sem 2025 data from:', pgFilePath);
    
    if (!fs.existsSync(pgFilePath)) {
      console.error('❌ Error: pg2025FIRSTSEM_formatted.json not found at', pgFilePath);
      return { success: false, count: 0 };
    }

    const pgData = JSON.parse(fs.readFileSync(pgFilePath, 'utf8'));
    const pgStudents = pgData.students || pgData; // Handle both wrapped and unwrapped formats
    
    if (!Array.isArray(pgStudents)) {
      console.error('❌ Error: PG data is not an array');
      return { success: false, count: 0 };
    }

    console.log(`📊 Found ${pgStudents.length} PG First Sem 2025 students`);

    // Clear existing data
    await PGFirstSem2025.deleteMany({});
    console.log('🧹 Cleared existing PG First Sem 2025 data');

    // Map and insert data - preserve exact field names with dots using bracket notation
    const mappedPGStudents = pgStudents.map(student => {
      // Create object using bracket notation to preserve field names with dots
      const mapped = {
        "Sl.No": student["Sl. No"] || student["Sl.No"] || null,
        "College Roll No": student["College  Roll No."] || student["College Roll No"] || null,
        "Autonomous Roll No": student["Autonomous  Roll No."] || student["Autonomous Roll No"] || null,
        "Name of the Students": student["Name of the Students"] || null,
        // PAPER fields - use bracket notation to preserve exact field names
        "PAPER-1.1": student["PAPER-1.1"] || null,
        "PAPER-1.2": student["PAPER-1.2"] || null,
        "PAPER-1.3": student["PAPER-1.3"] || null,
        "PAPER-1.4": student["PAPER-1.4"] || null,
        "PAPER-1.5": student["PAPER-1.5"] || null,
        "PAPER-1.6": student["PAPER-1.6"] || null,
        "PAPER-1.7": student["PAPER-1.7"] || null,
        // Always include these fields with defaults (matching UGStudent model)
        dob: student.DOB || student.dob || "01-01-2005",
        ABC_ID: student.ABC_ID || null,
        profileImage: student.profileImage || null,
        batch: "2025"
      };
      
      // Remove null values for cleaner documents, but keep dob, ABC_ID, and profileImage
      const cleaned = {};
      Object.keys(mapped).forEach(key => {
        // Always include dob, ABC_ID, and profileImage even if null
        if (key === 'dob' || key === 'ABC_ID' || key === 'profileImage') {
          cleaned[key] = mapped[key];
        } else if (mapped[key] !== null && mapped[key] !== undefined) {
          cleaned[key] = mapped[key];
        }
      });
      
      return cleaned;
    });

    // Verify first student structure before inserting
    if (mappedPGStudents.length > 0) {
      const firstStudent = mappedPGStudents[0];
      console.log('\n📋 Sample student structure (before insert):');
      console.log(`   Autonomous Roll No: ${firstStudent["Autonomous Roll No"]}`);
      console.log(`   PAPER-1.1: ${firstStudent["PAPER-1.1"]}`);
      console.log(`   PAPER-1.2: ${firstStudent["PAPER-1.2"]}`);
      console.log(`   PAPER-1.3: ${firstStudent["PAPER-1.3"]}`);
      console.log(`   PAPER-1.4: ${firstStudent["PAPER-1.4"]}`);
      console.log(`   PAPER-1.5: ${firstStudent["PAPER-1.5"]}`);
      console.log(`   PAPER-1.6: ${firstStudent["PAPER-1.6"]}`);
      console.log(`   PAPER-1.7: ${firstStudent["PAPER-1.7"]}`);
      console.log(`   Has nested PAPER-1?: ${!!firstStudent["PAPER-1"]}`);
      console.log(`   All keys: ${Object.keys(firstStudent).join(', ')}`);
    }

    // Use native MongoDB driver to preserve field names with dots
    // MongoDB interprets dots as nested paths, so we use the native collection
    console.log('📤 Inserting PG students (preserving field names with dots)...');
    const collection = mongoose.connection.db.collection('pgfirstsem2025');
    
    // Use native insertMany to preserve exact field names
    const pgResult = await collection.insertMany(mappedPGStudents, { ordered: false });
    console.log(`✅ Imported ${pgResult.insertedCount} PG First Sem 2025 students`);

    // Verify one record after insertion - check both flat and nested structures
    if (pgResult.insertedCount > 0) {
      // Use native collection to read back and verify field structure
      const verifyStudent = await collection.findOne({ 
        "Autonomous Roll No": mappedPGStudents[0]["Autonomous Roll No"] 
      });
      
      if (verifyStudent) {
        console.log('\n✅ Verification - First student after import:');
        console.log(`   PAPER-1.1: ${verifyStudent["PAPER-1.1"]}`);
        console.log(`   PAPER-1.2: ${verifyStudent["PAPER-1.2"]}`);
        console.log(`   PAPER-1.3: ${verifyStudent["PAPER-1.3"]}`);
        console.log(`   PAPER-1.4: ${verifyStudent["PAPER-1.4"]}`);
        console.log(`   PAPER-1.5: ${verifyStudent["PAPER-1.5"]}`);
        console.log(`   PAPER-1.6: ${verifyStudent["PAPER-1.6"]}`);
        console.log(`   PAPER-1.7: ${verifyStudent["PAPER-1.7"]}`);
        console.log(`   Has nested PAPER-1?: ${!!verifyStudent["PAPER-1"]}`);
        if (verifyStudent["PAPER-1"]) {
          console.log(`   ⚠️  WARNING: Found nested PAPER-1 structure:`, verifyStudent["PAPER-1"]);
        }
        console.log(`   All keys: ${Object.keys(verifyStudent).filter(k => k.startsWith('PAPER')).join(', ')}`);
      }
    }

    return { success: true, count: pgResult.insertedCount };
  } catch (error) {
    console.error('❌ Error importing PG First Sem 2025:', error.message);
    return { success: false, count: 0, error: error.message };
  }
};

// Main import function
const importFirstSem2025 = async () => {
  try {
    await connectDB();

    console.log('\n🚀 Starting First Sem 2025 data import...\n');

    // Import both UG and PG data
    const [ugResult, pgResult] = await Promise.all([
      importUGFirstSem2025(),
      importPGFirstSem2025()
    ]);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FIRST SEM 2025 IMPORT SUMMARY');
    console.log('='.repeat(70));
    console.log(`UG First Sem 2025: ${ugResult.success ? '✅' : '❌'} ${ugResult.count} students`);
    if (ugResult.error) {
      console.log(`   Error: ${ugResult.error}`);
    }
    console.log(`PG First Sem 2025: ${pgResult.success ? '✅' : '❌'} ${pgResult.count} students`);
    if (pgResult.error) {
      console.log(`   Error: ${pgResult.error}`);
    }
    console.log(`Total: ${ugResult.count + pgResult.count} students`);
    console.log('='.repeat(70));

    console.log('\n✅ First Sem 2025 import completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the import
if (require.main === module) {
  importFirstSem2025();
}

module.exports = { importFirstSem2025, importUGFirstSem2025, importPGFirstSem2025 };

