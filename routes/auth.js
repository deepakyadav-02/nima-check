const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');

// Admin credentials (in production, use a proper Admin model with hashed passwords)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
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

    // Build query conditions for each model that check all possible roll number fields
    // For UGStudent: check "Autonomous Roll No" OR "Roll No"
    const ugQuery = {
      $or: [
        { "Autonomous Roll No": trimmedRollNo },
        { "Roll No": trimmedRollNo }
      ],
      dob: trimmedDob
    };

    // For PGStudent: check "Autonomous Roll No" OR "College Roll No"
    const pgQuery = {
      $or: [
        { "Autonomous Roll No": trimmedRollNo },
        { "College Roll No": trimmedRollNo }
      ],
      "DOB": trimmedDob
    };

    // For BBAStudent: check "Autonomous Roll No" OR "Roll No"
    const bbaQuery = {
      $or: [
        { "Autonomous Roll No": trimmedRollNo },
        { "Roll No": trimmedRollNo }
      ],
      dob: trimmedDob
    };

    // For UGFirstSem2025: check "Autonomous Roll No" OR "Roll No" (no DOB check - default DOB)
    const ugFirstSem2025Query = {
      $or: [
        { "Autonomous Roll No": trimmedRollNo },
        { "Roll No": trimmedRollNo }
      ]
    };

    // For PGFirstSem2025: check "Autonomous Roll No" OR "College Roll No" (no DOB check - default DOB)
    const pgFirstSem2025Query = {
      $or: [
        { "Autonomous Roll No": trimmedRollNo },
        { "College Roll No": trimmedRollNo }
      ]
    };

    // Check in all five models and find the best match
    const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
      UGStudent.findOne(ugQuery),
      PGStudent.findOne(pgQuery),
      BBAStudent.findOne(bbaQuery),
      UGFirstSem2025.findOne(ugFirstSem2025Query),
      PGFirstSem2025.findOne(pgFirstSem2025Query)
    ]);

    console.log('Query results:', {
      ugStudent: !!ugStudent,
      pgStudent: !!pgStudent,
      bbaStudent: !!bbaStudent,
      ugFirstSem2025: !!ugFirstSem2025,
      pgFirstSem2025: !!pgFirstSem2025
    });

    let student = null;
    let studentType = null;

    // Determine the correct student type based on priority: BBA > PG > PGFirstSem2025 > UG > UGFirstSem2025
    if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
      student = bbaStudent;
      studentType = 'BBA';
    } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
      student = pgStudent;
      studentType = 'PG';
    } else if (pgFirstSem2025) {
      student = pgFirstSem2025;
      studentType = 'PG2025';
    } else if (ugStudent) {
      student = ugStudent;
      studentType = 'UG';
    } else if (ugFirstSem2025) {
      student = ugFirstSem2025;
      studentType = 'UG2025';
    }

    if (!student) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get the actual autonomous roll no from the student record for JWT payload
    const autonomousRollNo = student["Autonomous Roll No"] || trimmedRollNo;

    // Create JWT payload
    const payload = {
      user: {
        id: student._id,
        autonomousRollNo: autonomousRollNo,
        studentType: studentType,
        name: student["Name of the Students"] || student["Applicant Name"] || student["Name"]
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
