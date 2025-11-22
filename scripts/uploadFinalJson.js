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

// Upload marksheets from final.json or pgMark_sheet.json
const uploadMarksheets = async () => {
  try {
    await connectDB();

    // Read final.json or pgMark_sheet.json
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='))?.split('=')[1] || 
                    (args.indexOf('--file') !== -1 ? args[args.indexOf('--file') + 1] : null);
    
    const defaultFile = fileArg || path.join(__dirname, '../final.json');
    const finalJsonPath = path.resolve(defaultFile);
    
    console.log('Reading marksheet file from:', finalJsonPath);
    
    if (!fs.existsSync(finalJsonPath)) {
      console.error('Error: File not found at', finalJsonPath);
      console.error('Usage: node uploadFinalJson.js [--file=path/to/file.json]');
      process.exit(1);
    }

    const finalData = JSON.parse(fs.readFileSync(finalJsonPath, 'utf8'));
    console.log(`\nTotal records in file: ${finalData.length}`);

    // Delete all existing marksheets
    console.log('\nDeleting all existing marksheets...');
    const deleteResult = await UGMarksheet.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing marksheets`);

    const results = {
      success: [],
      failed: []
    };

    console.log('\nStarting upload process...\n');

    // Process each marksheet
    for (let i = 0; i < finalData.length; i++) {
      const marksheetData = finalData[i];
      
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
          console.log(`[${i + 1}/${finalData.length}] ❌ Failed: Missing AutonomousRollNo`);
          continue;
        }

        if (!marksheetData.semester) {
          results.failed.push({
            index: i,
            collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
            autonomousRollNo: rollNo,
            error: 'Semester is missing'
          });
          console.log(`[${i + 1}/${finalData.length}] ❌ Failed: Missing semester for ${rollNo}`);
          continue;
        }

        if (!marksheetData.courses || !Array.isArray(marksheetData.courses) || marksheetData.courses.length === 0) {
          results.failed.push({
            index: i,
            collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
            autonomousRollNo: rollNo,
            error: 'Courses array is missing or empty'
          });
          console.log(`[${i + 1}/${finalData.length}] ❌ Failed: Missing courses for ${rollNo}`);
          continue;
        }

        // Find student by Autonomous Roll No in UG, PG, or BBA collections
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
          console.log(`[${i + 1}/${finalData.length}] ❌ Failed: Student not found for ${rollNo}`);
          continue;
        }

        // Normalize courses - support both UG and PG formats
        const processedCourses = marksheetData.courses.map((course) => {
          const normalized = {
            subjectName: course.subjectName,
            courseType: course.courseType, // Preserve PG course types (PAPER1.1, etc.)
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

        // Check if marksheet already exists
        let marksheet = await UGMarksheet.findOne({
          student: student._id,
          studentType: studentType,
          semester: marksheetData.semester
        });

        const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
        
        if (marksheet) {
          // Update existing
          marksheet.studentType = studentType;
          marksheet.courses = processedCourses;
          marksheet.totalCredits = totalCredits;
          marksheet.totalCreditPoints = totalCreditPoints;
          marksheet.sgpa = sgpa;
          marksheet.percentage = percentage;
          marksheet.classification = classification;
          marksheet.updatedBy = 'admin@nimapara.edu';
          
          await marksheet.save();
          
          results.success.push({
            index: i,
            action: 'updated',
            studentName: studentName,
            studentType: studentType,
            autonomousRollNo: rollNo,
            semester: marksheetData.semester
          });
          console.log(`[${i + 1}/${finalData.length}] ✅ Updated: ${studentName} (${rollNo}, ${studentType}) - Semester ${marksheetData.semester}`);
        } else {
          // Create new
          marksheet = new UGMarksheet({
            student: student._id,
            studentType: studentType,
            semester: marksheetData.semester,
            courses: processedCourses,
            totalCredits,
            totalCreditPoints,
            sgpa,
            percentage,
            classification,
            createdBy: 'admin@nimapara.edu',
            updatedBy: 'admin@nimapara.edu'
          });

          await marksheet.save();

          results.success.push({
            index: i,
            action: 'created',
            studentName: studentName,
            studentType: studentType,
            autonomousRollNo: rollNo,
            semester: marksheetData.semester
          });
          console.log(`[${i + 1}/${finalData.length}] ✅ Created: ${studentName} (${rollNo}, ${studentType}) - Semester ${marksheetData.semester}`);
        }

      } catch (error) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          autonomousRollNo: marksheetData.AutonomousRollNo || marksheetData.autonomousRollNo || 'N/A',
          error: error.message
        });
        console.log(`[${i + 1}/${finalData.length}] ❌ Error: ${error.message}`);
      }
    }

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
    console.log('\n' + '='.repeat(60));
    console.log('UPLOAD SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Students: ${finalData.length}`);
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`   - UG Students: ${successByType.UGStudent}`);
    console.log(`   - PG Students: ${successByType.PGStudent}`);
    console.log(`   - BBA Students: ${successByType.BBAStudent}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(60));

    if (results.failed.length > 0) {
      console.log('\nFailed Records:');
      results.failed.slice(0, 10).forEach((fail, idx) => {
        console.log(`${idx + 1}. Index ${fail.index}: ${fail.error} (Roll: ${fail.autonomousRollNo})`);
      });
      if (results.failed.length > 10) {
        console.log(`... and ${results.failed.length - 10} more`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../upload-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to: ${resultsPath}`);

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
};

// Run the upload
uploadMarksheets();

