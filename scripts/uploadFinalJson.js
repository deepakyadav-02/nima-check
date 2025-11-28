const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGMarksheet = require('../models/UGMarksheet');

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

// Get current database state
const getCurrentState = async () => {
  const state = {
    totalMarksheets: await UGMarksheet.countDocuments({}),
    byStudentType: {
      UGStudent: await UGMarksheet.countDocuments({ studentType: 'UGStudent' }),
      PGStudent: await UGMarksheet.countDocuments({ studentType: 'PGStudent' }),
      BBAStudent: await UGMarksheet.countDocuments({ studentType: 'BBAStudent' })
    },
    bySemester: {},
    byDepartment: {}
  };

  // Get semester breakdown
  const semesterAgg = await UGMarksheet.aggregate([
    { $group: { _id: '$semester', count: { $sum: 1 } } }
  ]);
  semesterAgg.forEach(item => {
    state.bySemester[item._id] = item.count;
  });

  // Get department breakdown
  const deptAgg = await UGMarksheet.aggregate([
    { $match: { department: { $exists: true, $ne: null } } },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  deptAgg.forEach(item => {
    state.byDepartment[item._id] = item.count;
  });

  // Get unique student count
  const studentAgg = await UGMarksheet.aggregate([
    { $group: { _id: '$student' } }
  ]);
  state.uniqueStudentsCount = studentAgg.length;

  return state;
};

// Process marksheet data
const processMarksheetData = async (marksheetDataArray, sourceType) => {
  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < marksheetDataArray.length; i++) {
    const marksheetData = marksheetDataArray[i];
    
    try {
      // Validate required fields - support multiple formats
      const rollNo = marksheetData.AutonomousRollNo || 
                    marksheetData.autonomousRollNo || 
                    marksheetData['Autonomous Roll No'];
      
      if (!rollNo) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          error: 'AutonomousRollNo is missing'
        });
        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`[${i + 1}/${marksheetDataArray.length}] ❌ Failed: Missing AutonomousRollNo`);
        }
        continue;
      }

      if (!marksheetData.semester) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          autonomousRollNo: rollNo,
          error: 'Semester is missing'
        });
        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`[${i + 1}/${marksheetDataArray.length}] ❌ Failed: Missing semester for ${rollNo}`);
        }
        continue;
      }

      if (!marksheetData.courses || !Array.isArray(marksheetData.courses) || marksheetData.courses.length === 0) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          autonomousRollNo: rollNo,
          error: 'Courses array is missing or empty'
        });
        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`[${i + 1}/${marksheetDataArray.length}] ❌ Failed: Missing courses for ${rollNo}`);
        }
        continue;
      }

      // Find student by Autonomous Roll No
      let student = null;
      let studentType = 'UGStudent';
      
      student = await UGStudent.findOne({ "Autonomous Roll No": rollNo });
      if (student) {
        studentType = 'UGStudent';
      } else {
        student = await PGStudent.findOne({ "Autonomous Roll No": rollNo });
        if (student) {
          studentType = 'PGStudent';
        } else {
          student = await BBAStudent.findOne({ "Autonomous Roll No": rollNo });
          if (student) {
            studentType = 'BBAStudent';
          }
        }
      }

      if (!student) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          autonomousRollNo: rollNo,
          error: `Student not found in UG, PG, or BBA database`
        });
        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`[${i + 1}/${marksheetDataArray.length}] ❌ Failed: Student not found for ${rollNo}`);
        }
        continue;
      }

      // Normalize courses - support both UG and PG formats
      const processedCourses = marksheetData.courses.map((course) => {
        const normalized = {
          subjectName: course.subjectName,
          courseType: course.courseType,
          credit: course.credit,
          marks: course.marks
        };

        // UG format fields
        if (course.theory !== undefined) normalized.theory = course.theory;
        if (course.internal !== undefined) normalized.internal = course.internal;
        
        // PG format fields
        if (course.midsem !== undefined) normalized.midsem = course.midsem;
        if (course.endsem !== undefined) normalized.endsem = course.endsem;
        
        // Common fields
        if (course.practical !== undefined) normalized.practical = course.practical;
        if (course.grade !== undefined) normalized.grade = course.grade;
        if (course.gradePoint !== undefined) normalized.gradePoint = course.gradePoint;
        if (course.creditPoint !== undefined) normalized.creditPoint = course.creditPoint;
        if (course.percentage !== undefined) normalized.percentage = course.percentage;

        return normalized;
      });

      // Use calculated values directly
      const totalCredits = marksheetData.totalCredits;
      const totalCreditPoints = marksheetData.totalCreditPoints;
      const sgpa = marksheetData.sgpa;
      const percentage = marksheetData.percentage;
      const classification = marksheetData.classification;
      const department = marksheetData.department || null;

      // Create new marksheet (old ones already deleted)
      const marksheet = new UGMarksheet({
        student: student._id,
        studentType: studentType,
        semester: marksheetData.semester,
        courses: processedCourses,
        totalCredits,
        totalCreditPoints,
        sgpa,
        percentage,
        classification,
        department,
        createdBy: 'admin@nimapara.edu',
        updatedBy: 'admin@nimapara.edu'
      });

      await marksheet.save();

      const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
      results.success.push({
        index: i,
        action: 'created',
        studentName: studentName,
        studentType: studentType,
        autonomousRollNo: rollNo,
        collegeRollNo: marksheetData.CollegeRollNo,
        semester: marksheetData.semester
      });
      
      if ((i + 1) % 100 === 0 || i < 5) {
        console.log(`[${i + 1}/${marksheetDataArray.length}] ✅ Created: ${studentName} (${rollNo}, ${studentType}) - Semester ${marksheetData.semester}`);
      }

    } catch (error) {
      results.failed.push({
        index: i,
        collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
        autonomousRollNo: marksheetData.AutonomousRollNo || marksheetData.autonomousRollNo || 'N/A',
        error: error.message
      });
      if ((i + 1) % 100 === 0 || i < 5) {
        console.log(`[${i + 1}/${marksheetDataArray.length}] ❌ Error: ${error.message}`);
      }
    }
  }

  return results;
};

// Upload marksheets from pgMark_sheet.json and final.json
const uploadMarksheets = async () => {
  try {
    await connectDB();

    // Capture current state
    console.log('\n📊 Capturing current database state...');
    const beforeState = await getCurrentState();
    console.log(`   Total Marksheets: ${beforeState.totalMarksheets}`);
    console.log(`   UG Students: ${beforeState.byStudentType.UGStudent}`);
    console.log(`   PG Students: ${beforeState.byStudentType.PGStudent}`);
    console.log(`   BBA Students: ${beforeState.byStudentType.BBAStudent}`);
    console.log(`   Unique Students: ${beforeState.uniqueStudentsCount}`);

    // Step 1: Upload PG marksheets from pgMark_sheet.json
    const pgMarkSheetPath = path.join(__dirname, '../JSONS/pgMark_sheet.json');
    console.log('\n📄 Step 1: Reading PG marksheet file from:', pgMarkSheetPath);
    
    if (!fs.existsSync(pgMarkSheetPath)) {
      console.error('❌ Error: pgMark_sheet.json not found at', pgMarkSheetPath);
      process.exit(1);
    }

    const pgMarksheetData = JSON.parse(fs.readFileSync(pgMarkSheetPath, 'utf8'));
    console.log(`   Total PG records: ${pgMarksheetData.length}`);

    // Delete only PG marksheets (to replace them)
    console.log('\n🧹 Deleting existing PG marksheets...');
    const deletePGResult = await UGMarksheet.deleteMany({ studentType: 'PGStudent' });
    console.log(`   Deleted ${deletePGResult.deletedCount} existing PG marksheets`);

    // Upload PG marksheets
    console.log('\n🚀 Uploading PG marksheets...\n');
    const pgResults = await processMarksheetData(pgMarksheetData, 'PG');

    // Step 2: Upload UG marksheets from final.json
    const finalJsonPath = path.join(__dirname, '../JSONS/final.json');
    console.log('\n📄 Step 2: Reading final.json from:', finalJsonPath);
    
    if (!fs.existsSync(finalJsonPath)) {
      console.error('❌ Error: final.json not found at', finalJsonPath);
      process.exit(1);
    }

    const finalData = JSON.parse(fs.readFileSync(finalJsonPath, 'utf8'));
    console.log(`   Total UG records: ${finalData.length}`);

    // Delete only UG and BBA marksheets (preserve PG marksheets)
    console.log('\n🧹 Deleting existing UG and BBA marksheets (PG marksheets preserved)...');
    const deleteUGResult = await UGMarksheet.deleteMany({
      studentType: { $in: ['UGStudent', 'BBAStudent'] }
    });
    console.log(`   Deleted ${deleteUGResult.deletedCount} existing UG/BBA marksheets`);

    // Upload UG marksheets
    console.log('\n🚀 Uploading UG marksheets...\n');
    const ugResults = await processMarksheetData(finalData, 'UG');

    // Combine results
    const results = {
      success: [...pgResults.success, ...ugResults.success],
      failed: [...pgResults.failed, ...ugResults.failed]
    };

    // Capture new state
    console.log('\n📊 Capturing new database state...');
    const afterState = await getCurrentState();

    // Calculate changes
    const changes = {
      totalMarksheets: {
        before: beforeState.totalMarksheets,
        after: afterState.totalMarksheets,
        difference: afterState.totalMarksheets - beforeState.totalMarksheets
      },
      byStudentType: {},
      uniqueStudents: {
        before: beforeState.uniqueStudentsCount,
        after: afterState.uniqueStudentsCount,
        difference: afterState.uniqueStudentsCount - beforeState.uniqueStudentsCount
      }
    };

    ['UGStudent', 'PGStudent', 'BBAStudent'].forEach(type => {
      changes.byStudentType[type] = {
        before: beforeState.byStudentType[type] || 0,
        after: afterState.byStudentType[type] || 0,
        difference: (afterState.byStudentType[type] || 0) - (beforeState.byStudentType[type] || 0)
      };
    });

    // Calculate breakdown by student type
    const successByType = {
      UGStudent: 0,
      PGStudent: 0,
      BBAStudent: 0
    };
    
    results.success.forEach(item => {
      if (item.studentType) {
        successByType[item.studentType] = (successByType[item.studentType] || 0) + 1;
      }
    });

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATABASE CHANGES SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n📈 Total Marksheets:`);
    console.log(`   Before: ${changes.totalMarksheets.before}`);
    console.log(`   After:  ${changes.totalMarksheets.after}`);
    console.log(`   Change: ${changes.totalMarksheets.difference > 0 ? '+' : ''}${changes.totalMarksheets.difference}`);

    console.log(`\n👥 Unique Students:`);
    console.log(`   Before: ${changes.uniqueStudents.before}`);
    console.log(`   After:  ${changes.uniqueStudents.after}`);
    console.log(`   Change: ${changes.uniqueStudents.difference > 0 ? '+' : ''}${changes.uniqueStudents.difference}`);

    console.log(`\n📚 By Student Type:`);
    ['UGStudent', 'PGStudent', 'BBAStudent'].forEach(type => {
      const change = changes.byStudentType[type];
      console.log(`   ${type}:`);
      console.log(`     Before: ${change.before}`);
      console.log(`     After:  ${change.after}`);
      console.log(`     Change: ${change.difference > 0 ? '+' : ''}${change.difference}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📋 UPLOAD RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Records Processed: ${pgMarksheetData.length + finalData.length}`);
    console.log(`   - PG Records: ${pgMarksheetData.length}`);
    console.log(`   - UG Records: ${finalData.length}`);
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`   - UG Students: ${successByType.UGStudent}`);
    console.log(`   - PG Students: ${successByType.PGStudent}`);
    console.log(`   - BBA Students: ${successByType.BBAStudent}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(80));

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Records (showing first 20):');
      results.failed.slice(0, 20).forEach((fail, idx) => {
        console.log(`   ${idx + 1}. Index ${fail.index}: ${fail.error}`);
        console.log(`      Roll: ${fail.autonomousRollNo}`);
      });
      if (results.failed.length > 20) {
        console.log(`   ... and ${results.failed.length - 20} more`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../upload-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      before: beforeState,
      after: afterState,
      changes: changes,
      uploadResults: results
    }, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ Upload completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the upload
uploadMarksheets();
