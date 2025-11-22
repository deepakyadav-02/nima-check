#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const dotenvPath = path.join(__dirname, '..', 'config.env');
if (fs.existsSync(dotenvPath)) {
  // Lazy load dotenv only when available to avoid runtime error
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: dotenvPath });
}

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
};

const hasFlag = (flag) => args.includes(flag);

const FILE_PATH = getArgValue('--file') || path.join(__dirname, '..', 'test1.json');
const BASE_URL = getArgValue('--base-url') || process.env.API_BASE_URL || 'http://localhost:5001/api';
const CHUNK_SIZE = parseInt(getArgValue('--chunk'), 10)
  || parseInt(process.env.BULK_UPLOAD_CHUNK_SIZE || '25', 10);
const ADMIN_USERNAME = getArgValue('--admin-user') || process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = getArgValue('--admin-pass') || process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_CREATED_BY = getArgValue('--created-by') || process.env.DEFAULT_CREATED_BY || 'admin@nimapara.edu';
const SKIP_CLEAR = hasFlag('--skip-clear');

if (!Number.isInteger(CHUNK_SIZE) || CHUNK_SIZE <= 0) {
  console.error('❌ Invalid chunk size. Provide a positive integer with --chunk.');
  process.exit(1);
}

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 120000
});

const readMarksheetsFile = () => {
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('JSON root must be an array of marksheet entries');
    }

    return parsed;
  } catch (error) {
    console.error('❌ Failed to read marksheet file:', error.message);
    process.exit(1);
  }
};

const adminLogin = async () => {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await http.post('/auth/admin-login', {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });

    const token = response.data?.token;
    if (!token) {
      throw new Error('Missing token in login response');
    }

    console.log('✅ Admin login successful');
    return token;
  } catch (error) {
    const details = error.response?.data?.message || error.response?.data || error.message;
    console.error('❌ Admin login failed:', details);
    process.exit(1);
  }
};

const clearExistingMarkSheets = async (token) => {
  if (SKIP_CLEAR) {
    console.log('⏭️  Skipping marksheet clearance step (per flag).');
    return;
  }

  console.log('🧹 Clearing existing marksheets...');
  try {
    const response = await http.delete('/marksheet/all/clear', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Cleared marksheets: ${response.data?.deletedCount ?? 'unknown count'}`);
  } catch (error) {
    const status = error.response?.status;
    const details = error.response?.data?.message || error.response?.data || error.message;
    console.error(`❌ Failed to clear marksheets (status ${status ?? 'unknown'}):`, details);
    process.exit(1);
  }
};

const normalizeCourseType = (value) => {
  if (!value) return 'Other';

  const raw = value.toString().trim();
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();

  // Handle PG course types (PAPER1.1, PAPER1.2, etc.) - preserve as-is
  if (upper.startsWith('PAPER')) {
    return raw; // Keep original format for PG papers
  }

  // Handle UG course types
  if (lower.includes('major') && lower.includes('cp-1')) return 'Major-cp-1';
  if (lower.includes('major') && lower.includes('cp-2')) return 'Major-cp-2';
  if (lower.startsWith('minor')) return 'Minor';
  if (lower.includes('mdc') || lower.includes('multidisciplinary')) return 'Multidisciplinary';
  if (lower === 'multidisciplinary') return 'Multidisciplinary';
  if (lower === 'aec') return 'AEC';
  if (lower === 'sec') return 'SEC';
  if (lower === 'vac' || lower === 'v.a.c') return 'VAC';
  if (lower === 'internship') return 'Internship';

  return 'Other';
};

const normalizeCourse = (course) => {
  const normalized = {
    subjectName: course.subjectName,
    courseType: normalizeCourseType(course.courseType),
    credit: course.credit
  };

  // Support both UG and PG formats
  if (course.theory !== undefined) normalized.theory = course.theory;
  if (course.internal !== undefined) normalized.internal = course.internal;
  if (course.midsem !== undefined) normalized.midsem = course.midsem; // PG format
  if (course.endsem !== undefined) normalized.endsem = course.endsem; // PG format
  if (course.practical !== undefined) normalized.practical = course.practical;
  if (course.marks !== undefined) normalized.marks = course.marks;
  if (course.grade !== undefined) normalized.grade = course.grade;
  if (course.gradePoint !== undefined) normalized.gradePoint = course.gradePoint;
  if (course.creditPoint !== undefined) normalized.creditPoint = course.creditPoint;
  if (course.percentage !== undefined) normalized.percentage = course.percentage;
  if (course._id) normalized._id = course._id;

  return normalized;
};

const mapToPayload = (entries) => entries.map((entry) => ({
  // Support both formats: autonomousRollNo (lowercase) or AutonomousRollNo (camelCase from pgMark_sheet.json)
  autonomousRollNo: entry.autonomousRollNo || entry.AutonomousRollNo,
  studentId: entry.studentId,
  semester: entry.semester,
  courses: Array.isArray(entry.courses) ? entry.courses.map(normalizeCourse) : [],
  totalCredits: entry.totalCredits,
  totalCreditPoints: entry.totalCreditPoints,
  sgpa: entry.sgpa,
  percentage: entry.percentage,
  classification: entry.classification,
  createdBy: entry.createdBy || DEFAULT_CREATED_BY,
  updatedBy: entry.updatedBy || entry.createdBy || DEFAULT_CREATED_BY
}));

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const uploadChunk = async (token, chunk, index, totalChunks) => {
  const payload = {
    createdBy: DEFAULT_CREATED_BY,
    marksheets: mapToPayload(chunk)
  };

  console.log(`📤 Uploading chunk ${index + 1}/${totalChunks} (${chunk.length} marksheets)...`);

  try {
    const response = await http.post('/marksheet/bulk-upload', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const { summary, results } = response.data;
    const success = summary?.successful ?? results?.success?.length ?? 0;
    const failed = summary?.failed ?? results?.failed?.length ?? 0;

    console.log(`   ✅ Chunk ${index + 1} uploaded. Success: ${success}, Failed: ${failed}`);

    if (failed > 0) {
      console.warn('   ⚠️  Some entries failed in this chunk.');
      const failedItems = results?.failed || [];
      if (failedItems.length > 0) {
        const sample = failedItems.slice(0, 3);
        console.warn('      Sample failure details:', JSON.stringify(sample, null, 2));
      }
    }
  } catch (error) {
    const status = error.response?.status;
    const details = error.response?.data?.message || error.response?.data || error.message;

    console.error(`❌ Chunk ${index + 1} failed (status ${status ?? 'unknown'}):`, details);

    if (error.response?.data?.results?.failed) {
      console.error('   Failed entries:', JSON.stringify(error.response.data.results.failed, null, 2));
    }

    process.exit(1);
  }
};

const run = async () => {
  console.log('🚀 Starting marksheet import');
  console.log('   File:', FILE_PATH);
  console.log('   Base URL:', BASE_URL);
  console.log('   Chunk size:', CHUNK_SIZE);

  const marksheets = readMarksheetsFile();
  console.log(`📦 Loaded ${marksheets.length} marksheet entries`);

  const token = await adminLogin();
  await clearExistingMarkSheets(token);

  const chunks = chunkArray(marksheets, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await uploadChunk(token, chunks[i], i, chunks.length);
  }

  console.log('🎉 All chunks uploaded successfully!');
};

if (require.main === module) {
  run().catch((error) => {
    console.error('❌ Import failed unexpectedly:', error.message);
    process.exit(1);
  });
}

module.exports = { run };


