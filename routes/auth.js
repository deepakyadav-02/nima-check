const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');

// Admin credentials (in production, use a proper Admin model with hashed passwords)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// @route   POST /api/auth/login
// @desc    Authenticate student & get token
// @access  Public
router.post('/login', [
  body('autonomousRollNo', 'Autonomous Roll No is required').not().isEmpty(),
  body('dob', 'Date of Birth is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { autonomousRollNo, dob } = req.body;

    // Check in all three models and find the best match
    const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo, dob: dob }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo, "DOB": dob }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo, dob: dob })
    ]);

    let student = null;
    let studentType = null;

    // Determine the correct student type based on department/course
    if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
      student = bbaStudent;
      studentType = 'BBA';
    } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
      student = pgStudent;
      studentType = 'PG';
    } else if (ugStudent) {
      student = ugStudent;
      studentType = 'UG';
    }

    if (!student) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: student._id,
        autonomousRollNo: autonomousRollNo,
        studentType: studentType,
        name: student["Name of the Students"] || student["Applicant Name"]
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
