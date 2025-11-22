const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const PGStudent = require('../models/PGStudent');
const UGMarksheet = require('../models/UGMarksheet');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Check for MONGO_URI in command line arguments first
    const args = process.argv.slice(2);
    const mongoUriArg = args.find(arg => arg.startsWith('--mongo-uri='))?.split('=')[1] || 
                        (args.indexOf('--mongo-uri') !== -1 ? args[args.indexOf('--mongo-uri') + 1] : null);
    
    const mongoUri = mongoUriArg || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI not found in environment variables or command line arguments');
      console.error('Usage: node uploadPGMarksheets.js [--mongo-uri=your_mongo_uri] [--file=path/to/file.json] [--skip-clear]');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Upload PG marksheets from pgMark_sheet.json
const uploadPGMarksheets = async () => {
  try {
    await connectDB();

    // Read pgMark_sheet.json
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='))?.split('=')[1] || 
                    (args.indexOf('--file') !== -1 ? args[args.indexOf('--file') + 1] : null);
    
    const defaultFile = fileArg || path.join(__dirname, '../JSONS/pgMark_sheet.json');
    const pgMarksheetPath = path.resolve(defaultFile);
    
    console.log('📄 Reading PG marksheet file from:', pgMarksheetPath);
    
    if (!fs.existsSync(pgMarksheetPath)) {
      console.error('❌ Error: File not found at', pgMarksheetPath);
      console.error('Usage: node uploadPGMarksheets.js [--file=path/to/pgMark_sheet.json]');
      process.exit(1);
    }

    const pgMarksheetData = JSON.parse(fs.readFileSync(pgMarksheetPath, 'utf8'));
    console.log(`\n📊 Total PG marksheet records: ${pgMarksheetData.length}`);

    // Check if PG marksheets exist in database
    const existingPGMarksheets = await UGMarksheet.countDocuments({ studentType: 'PGStudent' });
    
    const argsArray = process.argv.slice(2);
    const skipClear = argsArray.includes('--skip-clear');
    
    if (existingPGMarksheets > 0 && !skipClear) {
      console.log(`\n📊 Found ${existingPGMarksheets} existing PG marksheets in database`);
      console.log('🧹 Deleting existing PG marksheets (UG and BBA marksheets will be preserved)...');
      
      // Delete only PG marksheets, keep UG and BBA marksheets
      const deleteResult = await UGMarksheet.deleteMany({ studentType: 'PGStudent' });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing PG marksheets\n`);
    } else if (existingPGMarksheets > 0 && skipClear) {
      console.log(`\n📊 Found ${existingPGMarksheets} existing PG marksheets in database`);
      console.log('⏭️  Skipping deletion (--skip-clear flag set). New marksheets will be added/updated.\n');
    } else {
      console.log('\n📊 No existing PG marksheets found in database. Proceeding with fresh upload.\n');
    }

    const results = {
      success: [],
      failed: []
    };

    console.log('🚀 Starting PG marksheet upload process...\n');

    // Process each marksheet
    for (let i = 0; i < pgMarksheetData.length; i++) {
      const marksheetData = pgMarksheetData[i];
      
      try {
        // Validate required fields - support multiple formats
        const rollNo = marksheetData.AutonomousRollNo || 
                      marksheetData.autonomousRollNo || 
                      marksheetData['Autonomous Roll No'];
        
        if (!rollNo) {
          results.failed.push({
            index: i,
            collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
            name: marksheetData.Name || 'N/A',
            error: 'AutonomousRollNo is missing'
          });
          if ((i + 1) % 100 === 0 || i === 0) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ❌ Failed: Missing AutonomousRollNo`);
          }
          continue;
        }

        if (!marksheetData.semester) {
          results.failed.push({
            index: i,
            collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
            autonomousRollNo: rollNo,
            name: marksheetData.Name || 'N/A',
            error: 'Semester is missing'
          });
          if ((i + 1) % 100 === 0 || i === 0) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ❌ Failed: Missing semester for ${rollNo}`);
          }
          continue;
        }

        if (!marksheetData.courses || !Array.isArray(marksheetData.courses) || marksheetData.courses.length === 0) {
          results.failed.push({
            index: i,
            collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
            autonomousRollNo: rollNo,
            name: marksheetData.Name || 'N/A',
            error: 'Courses array is missing or empty'
          });
          if ((i + 1) % 100 === 0 || i === 0) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ❌ Failed: Missing courses for ${rollNo}`);
          }
          continue;
        }

        // Find or create PG student by Autonomous Roll No
        let student = await PGStudent.findOne({ "Autonomous Roll No": rollNo });

        if (!student) {
          // Create PG student if not found
          const collegeRollNo = marksheetData.CollegeRollNo || marksheetData.collegeRollNo || '';
          const studentName = marksheetData.Name || marksheetData.name || '';
          const department = marksheetData.department || marksheetData.Department || marksheetData.Course || '';
          
          // Extract department from College Roll No if not available (e.g., ODIA24-001 -> ODIA)
          let extractedDept = department;
          if (!extractedDept && collegeRollNo) {
            const match = collegeRollNo.match(/^([A-Z]+)\d+/);
            if (match && match[1]) {
              extractedDept = match[1];
            }
          }
          
          student = new PGStudent({
            "Autonomous Roll No": rollNo,
            "College Roll No": collegeRollNo,
            "Applicant Name": studentName,
            "Course": extractedDept,
            "DOB": marksheetData.DOB || marksheetData.dob || '',
            "Graduation Board": marksheetData["Graduation Board"] || marksheetData.graduationBoard || ''
          });
          
          await student.save();
          if ((i + 1) % 10 === 0 || i < 5) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ✅ Created PG Student: ${rollNo} - ${studentName}`);
          }
        }

        // Normalize courses - handle PG-specific fields
        const processedCourses = marksheetData.courses.map((course) => {
          const normalized = {
            subjectName: course.subjectName,
            courseType: course.courseType, // Preserve PG course types (PAPER1.1, PAPER1.2, etc.)
            credit: course.credit,
            marks: course.marks
          };

          // PG format fields (midsem, endsem)
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

        // Use calculated values directly from JSON
        const totalCredits = marksheetData.totalCredits;
        const totalCreditPoints = marksheetData.totalCreditPoints;
        const sgpa = marksheetData.sgpa;
        const percentage = marksheetData.percentage;
        const classification = marksheetData.classification;
        const department = marksheetData.department || null; // Store department from JSON

        // Check if marksheet already exists
        let marksheet = await UGMarksheet.findOne({
          student: student._id,
          studentType: 'PGStudent',
          semester: marksheetData.semester
        });

        const studentName = student["Applicant Name"] || marksheetData.Name || 'N/A';
        
        if (marksheet) {
          // Update existing marksheet
          marksheet.studentType = 'PGStudent';
          marksheet.courses = processedCourses;
          marksheet.totalCredits = totalCredits;
          marksheet.totalCreditPoints = totalCreditPoints;
          marksheet.sgpa = sgpa;
          marksheet.percentage = percentage;
          marksheet.classification = classification;
          marksheet.department = department;
          marksheet.updatedBy = 'admin@nimapara.edu';
          
          await marksheet.save();
          
          results.success.push({
            index: i,
            action: 'updated',
            studentName: studentName,
            studentType: 'PGStudent',
            autonomousRollNo: rollNo,
            collegeRollNo: marksheetData.CollegeRollNo,
            semester: marksheetData.semester
          });
          
          // Show progress every 100 records or for first few
          if ((i + 1) % 100 === 0 || i < 5) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ✅ Updated: ${studentName} (${rollNo}) - Semester ${marksheetData.semester}`);
          }
        } else {
          // Create new marksheet
          marksheet = new UGMarksheet({
            student: student._id,
            studentType: 'PGStudent',
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

          results.success.push({
            index: i,
            action: 'created',
            studentName: studentName,
            studentType: 'PGStudent',
            autonomousRollNo: rollNo,
            collegeRollNo: marksheetData.CollegeRollNo,
            semester: marksheetData.semester
          });
          
          // Show progress every 100 records or for first few
          if ((i + 1) % 100 === 0 || i < 5) {
            console.log(`[${i + 1}/${pgMarksheetData.length}] ✅ Created: ${studentName} (${rollNo}) - Semester ${marksheetData.semester}`);
          }
        }

      } catch (error) {
        results.failed.push({
          index: i,
          collegeRollNo: marksheetData.CollegeRollNo || 'N/A',
          autonomousRollNo: marksheetData.AutonomousRollNo || marksheetData.autonomousRollNo || 'N/A',
          name: marksheetData.Name || 'N/A',
          error: error.message
        });
        
        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`[${i + 1}/${pgMarksheetData.length}] ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 PG MARKSHEET UPLOAD SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records Processed: ${pgMarksheetData.length}`);
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(70));

    // Breakdown by action
    const created = results.success.filter(r => r.action === 'created').length;
    const updated = results.success.filter(r => r.action === 'updated').length;
    
    if (results.success.length > 0) {
      console.log(`\n📝 Breakdown:`);
      console.log(`   - Created: ${created}`);
      console.log(`   - Updated: ${updated}`);
    }

    // Show semester breakdown
    const semesterBreakdown = {};
    results.success.forEach(item => {
      const sem = item.semester || 'Unknown';
      semesterBreakdown[sem] = (semesterBreakdown[sem] || 0) + 1;
    });
    
    if (Object.keys(semesterBreakdown).length > 0) {
      console.log(`\n📚 By Semester:`);
      Object.keys(semesterBreakdown).sort().forEach(sem => {
        console.log(`   - Semester ${sem}: ${semesterBreakdown[sem]}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed Records (showing first 20):`);
      results.failed.slice(0, 20).forEach((fail, idx) => {
        console.log(`   ${idx + 1}. Index ${fail.index}: ${fail.error}`);
        console.log(`      Roll: ${fail.autonomousRollNo}, Name: ${fail.name}`);
      });
      if (results.failed.length > 20) {
        console.log(`   ... and ${results.failed.length - 20} more`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../pg-upload-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ PG marksheet upload completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the upload
if (require.main === module) {
  uploadPGMarksheets();
}

module.exports = { uploadPGMarksheets };

