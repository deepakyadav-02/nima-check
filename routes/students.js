const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');

// @route   GET /api/students/admit-card
// @desc    Get student data for admit card using query params
// @access  Public (no auth required for admit card)
router.get('/admit-card', async (req, res) => {
  try {
    const { autonomousRollNo } = req.query;

    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    // Check in all three models and find the best match
    const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo })
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
      return res.status(404).json({ message: 'Student not found' });
    }

    // Format data for admit card
    const admitCardData = {
      studentType,
      autonomousRollNo: student["Autonomous Roll No"],
      name: student["Name of the Students"] || student["Applicant Name"],
      rollNo: student["Roll No"] || student["College Roll No"],
      department: student["Department"] || student["Course"],
      dob: student["dob"] || student["DOB"],
      ...student.toObject()
    };

    res.json(admitCardData);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/students/profile
// @desc    Get authenticated student profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const { autonomousRollNo, studentType } = req.user;

    let student;
    
    switch (studentType) {
      case 'UG':
        student = await UGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        break;
      case 'PG':
        student = await PGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        break;
      case 'BBA':
        student = await BBAStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid student type' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/students/search
// @desc    Search students by autonomous roll no
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { autonomousRollNo } = req.query;

    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    // Search in all models and find the best match
    const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo })
    ]);

    let result = null;
    let studentType = null;

    // Determine the correct student type based on department/course
    if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
      result = bbaStudent;
      studentType = 'BBA';
    } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
      result = pgStudent;
      studentType = 'PG';
    } else if (ugStudent) {
      result = ugStudent;
      studentType = 'UG';
    }

    if (!result) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      studentType,
      student: result
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
