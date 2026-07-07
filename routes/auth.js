const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { findStudentByRoll, enrichStudentRecord } = require('../utils/studentLookup');

// Admin credentials (in production, use a proper Admin model with hashed passwords)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

const getStoredDob = (student) => {
  const value = student?.dob ?? student?.DOB;
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const dobMatches = (student, trimmedDob) => {
  const storedDob = getStoredDob(student);
  if (!storedDob) return true;
  return storedDob === trimmedDob;
};

// @route   POST /api/auth/login
// @desc    Authenticate student & get token
// @access  Public
router.post('/login', [
  body('autonomousRollNo', 'Roll No is required').optional().not().isEmpty(),
  body('rollNo', 'Roll No is required').optional().not().isEmpty(),
  body('dob', 'Date of Birth is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Accept either autonomousRollNo or rollNo for backward compatibility
    const rollNoInput = req.body.autonomousRollNo || req.body.rollNo;
    const { dob } = req.body;

    if (!rollNoInput) {
      return res.status(400).json({ message: 'Roll No (Autonomous Roll No, Roll No, or College Roll No) is required' });
    }

    // Trim whitespace from inputs
    const trimmedRollNo = rollNoInput?.trim();
    const trimmedDob = dob?.trim();

    console.log('Login attempt:', { rollNo: trimmedRollNo, dob: trimmedDob });

    const { student, studentType } = await findStudentByRoll(trimmedRollNo);
    const studentRecord = student ? await enrichStudentRecord(student) : null;

    console.log('Query results:', {
      found: !!studentRecord,
      studentType,
      storedDob: studentRecord ? getStoredDob(studentRecord) : null,
    });

    if (!studentRecord) {
      return res.status(400).json({ message: 'Invalid credentials. Roll number not found.' });
    }

    if (!dobMatches(studentRecord, trimmedDob)) {
      return res.status(400).json({
        message: 'Invalid credentials. Date of birth does not match our records.',
      });
    }

    // Get the actual autonomous roll no from the student record for JWT payload
    const autonomousRollNo = studentRecord["Autonomous Roll No"] || trimmedRollNo;

    // Create JWT payload
    const payload = {
      user: {
        id: studentRecord._id,
        autonomousRollNo: autonomousRollNo,
        studentType: studentType,
        name: studentRecord["Name of the Students"] || studentRecord["Applicant Name"] || studentRecord["Name"]
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: payload.user,
          message: 'Login successful'
        });
      }
    );

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/admin-login
// @desc    Authenticate admin & get token
// @access  Public
router.post('/admin-login', [
  body('username', 'Username is required').not().isEmpty(),
  body('password', 'Password is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Validate admin credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    // Create JWT payload with admin role
    const payload = {
      user: {
        id: 'admin',
        username: username,
        role: 'admin',
        name: 'Administrator'
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: payload.user,
          message: 'Admin login successful'
        });
      }
    );

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
