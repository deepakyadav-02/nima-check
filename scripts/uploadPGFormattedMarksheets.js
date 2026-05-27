const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const PGStudent = require('../models/PGStudent');
const UGMarksheet = require('../models/UGMarksheet');
const {
  transformFormattedFile,
  inferSemesterFromPath,
} = require('../utils/pgFormattedTransformer');

const connectDB = async () => {
  const args = process.argv.slice(2);
  const mongoUriArg = args.find((arg) => arg.startsWith('--mongo-uri='))?.split('=')[1]
    || (args.indexOf('--mongo-uri') !== -1 ? args[args.indexOf('--mongo-uri') + 1] : null);

  const mongoUri = mongoUriArg || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI not found in environment variables or command line arguments');
    console.error('Usage: node uploadPGFormattedMarksheets.js [--file=path] [--semester=4] [--skip-clear]');
    process.exit(1);
  }

  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const getArgValue = (flag) => {
  const args = process.argv.slice(2);
  const prefixed = args.find((arg) => arg.startsWith(`${flag}=`));
  if (prefixed) return prefixed.split('=').slice(1).join('=');
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) return args[index + 1];
  return undefined;
};

const normalizeCourses = (courses) => courses.map((course) => {
  const normalized = {
    subjectName: course.subjectName,
    courseType: course.courseType,
    credit: course.credit,
    marks: course.marks,
  };

  if (course.midsem !== undefined) normalized.midsem = course.midsem;
  if (course.endsem !== undefined) normalized.endsem = course.endsem;
  if (course.practical !== undefined) normalized.practical = course.practical;
  if (course.grade !== undefined) normalized.grade = course.grade;
  if (course.gradePoint !== undefined) normalized.gradePoint = course.gradePoint;
  if (course.creditPoint !== undefined) normalized.creditPoint = course.creditPoint;
  if (course.percentage !== undefined) normalized.percentage = course.percentage;

  return normalized;
});

const uploadPGFormattedMarksheets = async () => {
  try {
    await connectDB();

    const fileArg = getArgValue('--file');
    const defaultFile = path.join(__dirname, '../JSONS/4thsem-pg-formatted.json');
    const jsonPath = path.resolve(fileArg || defaultFile);

    const semesterArg = getArgValue('--semester');
    const semester = semesterArg
      ? parseInt(semesterArg, 10)
      : inferSemesterFromPath(jsonPath);

    if (!semester || !Number.isInteger(semester)) {
      console.error('❌ Could not determine semester. Pass --semester=4');
      process.exit(1);
    }

    if (!fs.existsSync(jsonPath)) {
      console.error('❌ File not found:', jsonPath);
      process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const pgMarksheetData = transformFormattedFile(rawData, semester);

    console.log('📄 Reading formatted PG file from:', jsonPath);
    console.log(`📊 Total records: ${pgMarksheetData.length}`);
    console.log(`📚 Target semester: ${semester}\n`);

    const skipClear = process.argv.slice(2).includes('--skip-clear');
    const existingCount = await UGMarksheet.countDocuments({
      studentType: 'PGStudent',
      semester,
    });

    if (existingCount > 0 && !skipClear) {
      console.log(`🧹 Replacing ${existingCount} existing PG semester ${semester} marksheets...`);
      const deleteResult = await UGMarksheet.deleteMany({
        studentType: 'PGStudent',
        semester,
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} marksheets\n`);
    } else if (existingCount > 0) {
      console.log(`⏭️  Found ${existingCount} existing semester ${semester} marksheets (--skip-clear)\n`);
    }

    const results = { success: [], failed: [] };

    for (let i = 0; i < pgMarksheetData.length; i += 1) {
      const marksheetData = pgMarksheetData[i];

      try {
        const rollNo = marksheetData.AutonomousRollNo;
        if (!rollNo) {
          results.failed.push({ index: i, error: 'Autonomous Roll No is missing' });
          continue;
        }

        if (!marksheetData.courses?.length) {
          results.failed.push({ index: i, autonomousRollNo: rollNo, error: 'No courses found' });
          continue;
        }

        let student = await PGStudent.findOne({ 'Autonomous Roll No': rollNo });

        if (!student) {
          const collegeRollNo = marksheetData.CollegeRollNo || '';
          let extractedDept = marksheetData.department || '';
          if (!extractedDept && collegeRollNo) {
            const match = collegeRollNo.match(/^([A-Z]+)\d+/i);
            if (match?.[1]) extractedDept = match[1];
          }

          student = new PGStudent({
            'Autonomous Roll No': rollNo,
            'College Roll No': collegeRollNo,
            'Applicant Name': marksheetData.Name || '',
            Course: extractedDept,
          });
          await student.save();
        }

        const processedCourses = normalizeCourses(marksheetData.courses);
        const studentName = student['Applicant Name'] || marksheetData.Name || 'N/A';

        let marksheet = await UGMarksheet.findOne({
          student: student._id,
          studentType: 'PGStudent',
          semester,
        });

        const payload = {
          studentType: 'PGStudent',
          courses: processedCourses,
          totalCredits: marksheetData.totalCredits,
          totalCreditPoints: marksheetData.totalCreditPoints,
          sgpa: marksheetData.sgpa,
          percentage: marksheetData.percentage,
          classification: marksheetData.classification,
          department: marksheetData.department || null,
          updatedBy: 'admin@nimapara.edu',
        };

        if (marksheet) {
          Object.assign(marksheet, payload);
          await marksheet.save();
          results.success.push({ index: i, action: 'updated', autonomousRollNo: rollNo, studentName, semester });
        } else {
          marksheet = new UGMarksheet({
            student: student._id,
            semester,
            ...payload,
            createdBy: 'admin@nimapara.edu',
          });
          await marksheet.save();
          results.success.push({ index: i, action: 'created', autonomousRollNo: rollNo, studentName, semester });
        }

        if ((i + 1) % 25 === 0 || i < 3) {
          console.log(`[${i + 1}/${pgMarksheetData.length}] ✅ ${studentName} (${rollNo})`);
        }
      } catch (error) {
        results.failed.push({
          index: i,
          autonomousRollNo: marksheetData.AutonomousRollNo,
          name: marksheetData.Name,
          error: error.message,
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`PG FORMATTED UPLOAD SUMMARY (Semester ${semester})`);
    console.log('='.repeat(70));
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
      console.log('\nFailed (first 10):');
      results.failed.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.autonomousRollNo || 'N/A'}: ${item.error}`);
      });
    }

    const resultsPath = path.join(__dirname, `../pg-formatted-upload-sem${semester}-results.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
    console.log('\n✅ Upload completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  uploadPGFormattedMarksheets();
}

module.exports = { uploadPGFormattedMarksheets };
