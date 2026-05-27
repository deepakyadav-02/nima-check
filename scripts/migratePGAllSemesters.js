const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGStudent = require('../models/PGStudent');
const UGMarksheet = require('../models/UGMarksheet');
const PGSem3Result = require('../models/PGSem3Result');
const PGSem4Result = require('../models/PGSem4Result');
const PGAllSemesters = require('../models/PGAllSemesters');
const {
  fromSem1,
  fromSem2,
  fromSem3Or4,
  studentMetaFromSem3Or4,
  studentMetaFromSem2,
  studentMetaFromStudent,
} = require('../utils/pgSemesterMigrators');
const { applyOverallTotals } = require('../utils/pgOverallMarks');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const emptyStudent = (autonomousRollNo) => ({
  autonomousRollNo,
  rollNo: '',
  studentName: '',
  department: '',
  course: '',
  dob: '',
  graduationBoard: '',
  semesters: { sem1: null, sem2: null, sem3: null, sem4: null },
});

const mergeMeta = (target, meta) => {
  if (!meta) return;
  if (meta.rollNo) target.rollNo = meta.rollNo;
  if (meta.studentName) target.studentName = meta.studentName;
  if (meta.department) target.department = meta.department;
  if (meta.course) target.course = meta.course;
  if (meta.dob) target.dob = meta.dob;
  if (meta.graduationBoard) target.graduationBoard = meta.graduationBoard;
};

const migratePGAllSemesters = async () => {
  const skipClear = process.argv.includes('--skip-clear');
  const stats = { students: 0, sem1: 0, sem2: 0, sem3: 0, sem4: 0, failed: [] };

  try {
    await connectDB();

    if (!skipClear) {
      const n = await PGAllSemesters.countDocuments();
      if (n > 0) {
        console.log(`🧹 Clearing ${n} documents from pgallsemesters...`);
        await PGAllSemesters.deleteMany({});
      }
    }

    const byRoll = new Map();

    const getOrCreate = (roll) => {
      const key = roll.trim();
      if (!byRoll.has(key)) byRoll.set(key, emptyStudent(key));
      return byRoll.get(key);
    };

    console.log('\n📚 Semester 1 ← UGMarksheet (PGStudent)...');
    const pgStudents = await PGStudent.find({});
    for (const student of pgStudents) {
      try {
        const roll = student['Autonomous Roll No']?.trim();
        if (!roll) continue;
        const marksheet = await UGMarksheet.findOne({
          student: student._id,
          studentType: 'PGStudent',
          semester: 1,
        });
        if (!marksheet) continue;
        const doc = getOrCreate(roll);
        mergeMeta(doc, studentMetaFromStudent(student));
        doc.semesters.sem1 = fromSem1(marksheet.toObject());
        stats.sem1 += 1;
      } catch (e) {
        stats.failed.push({ sem: 1, roll: student['Autonomous Roll No'], error: e.message });
      }
    }
    console.log(`   ✅ ${stats.sem1} students with sem1`);

    console.log('\n📚 Semester 2 ← pg2ndsem2024...');
    const sem2Cursor = mongoose.connection.db.collection('pg2ndsem2024').find({});
    for await (const row of sem2Cursor) {
      try {
        const roll = (
          row.autonomousRollNo ||
          row['Autonomous Roll No'] ||
          row['Autonomous Roll No.'] ||
          ''
        ).trim();
        if (!roll) continue;
        const doc = getOrCreate(roll);
        mergeMeta(doc, studentMetaFromSem2(row));
        doc.semesters.sem2 = fromSem2(row);
        stats.sem2 += 1;
      } catch (e) {
        stats.failed.push({ sem: 2, roll: row.autonomousRollNo, error: e.message });
      }
    }
    console.log(`   ✅ ${stats.sem2} students with sem2`);

    console.log('\n📚 Semester 3 ← pgsem3results...');
    const sem3Docs = await PGSem3Result.find({});
    for (const row of sem3Docs) {
      try {
        const roll = row.autonomousRollNo?.trim();
        if (!roll) continue;
        const doc = getOrCreate(roll);
        mergeMeta(doc, studentMetaFromSem3Or4(row.toObject()));
        doc.semesters.sem3 = fromSem3Or4(row.toObject(), 'pgsem3results', 3);
        stats.sem3 += 1;
      } catch (e) {
        stats.failed.push({ sem: 3, roll: row.autonomousRollNo, error: e.message });
      }
    }
    console.log(`   ✅ ${stats.sem3} students with sem3`);

    console.log('\n📚 Semester 4 ← pgsem4results...');
    const sem4Docs = await PGSem4Result.find({});
    for (const row of sem4Docs) {
      try {
        const roll = row.autonomousRollNo?.trim();
        if (!roll) continue;
        const doc = getOrCreate(roll);
        mergeMeta(doc, studentMetaFromSem3Or4(row.toObject()));
        doc.semesters.sem4 = fromSem3Or4(row.toObject(), 'pgsem4results', 4);
        stats.sem4 += 1;
      } catch (e) {
        stats.failed.push({ sem: 4, roll: row.autonomousRollNo, error: e.message });
      }
    }
    console.log(`   ✅ ${stats.sem4} students with sem4`);

    console.log('\n💾 Writing merged documents to pgallsemesters...');
    for (const doc of byRoll.values()) {
      const withTotals = applyOverallTotals(doc);
      await PGAllSemesters.findOneAndUpdate(
        { autonomousRollNo: withTotals.autonomousRollNo },
        { $set: withTotals },
        { upsert: true, new: true }
      );
      stats.students += 1;
    }

    const total = await PGAllSemesters.countDocuments();
    const sample = await PGAllSemesters.findOne({ autonomousRollNo: '111NAC24001' })
      .select('autonomousRollNo studentName semesters.sem1 semesters.sem3 semesters.sem4');

    console.log('\n' + '='.repeat(60));
    console.log('PG ALL SEMESTERS MIGRATION (one doc per student)');
    console.log('='.repeat(60));
    console.log(`Students written: ${stats.students}`);
    console.log(`Sem blocks found — 1:${stats.sem1} 2:${stats.sem2} 3:${stats.sem3} 4:${stats.sem4}`);
    console.log(`Total in pgallsemesters: ${total}`);
    console.log(`Failed: ${stats.failed.length}`);
    if (sample) {
      console.log('\nSample 111NAC24001:', {
        name: sample.studentName,
        hasSem1: !!sample.semesters?.sem1,
        hasSem3: !!sample.semesters?.sem3,
        hasSem4: !!sample.semesters?.sem4,
      });
    }

    const logPath = path.join(__dirname, '../pgallsemesters-migration-results.json');
    fs.writeFileSync(logPath, JSON.stringify(stats, null, 2));
    console.log(`\n💾 Log: ${logPath}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  migratePGAllSemesters();
}

module.exports = { migratePGAllSemesters };
