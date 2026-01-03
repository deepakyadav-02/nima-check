const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');

// @route   GET /api/students/admit-card
// @desc    Get student data for admit card using query params
// @access  Public (no auth required for admit card)
router.get('/admit-card', async (req, res) => {
  try {
    const { autonomousRollNo } = req.query;

    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    // Check in all five models and find the best match
    const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
    ]);

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
      return res.status(404).json({ message: 'Student not found' });
    }

    // Format data for admit card
    const admitCardData = {
      studentType,
      autonomousRollNo: student["Autonomous Roll No"],
      name: student["Name of the Students"] || student["Applicant Name"] || student["Name"],
      rollNo: student["Roll No"] || student["College Roll No"],
      department: student["Department"] || student["Course"] || null,
      dob: student["dob"] || student["DOB"],
      ABC_ID: student.ABC_ID || null,
      profileImage: student.profileImage || null,
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
    console.log('Profile route - req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not found in token' });
    }
    
    let { autonomousRollNo, studentType } = req.user;
    
    if (!autonomousRollNo) {
      console.error('Missing autonomousRollNo:', req.user);
      return res.status(400).json({ 
        message: 'Invalid token data - missing roll number',
        received: req.user
      });
    }

    // If studentType is missing or invalid, try to detect it from roll number
    if (!studentType || !['UG', 'PG', 'BBA', 'UG2025', 'PG2025'].includes(studentType.toUpperCase())) {
      console.log('StudentType missing or invalid, detecting from roll number:', {
        studentType,
        autonomousRollNo
      });
      
      // Try to find student in all collections to determine type
      const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
        UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
        PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
      ]);

      // Determine student type based on which collection has the student (priority: BBA > PG > PG2025 > UG > UG2025)
      if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
        studentType = 'BBA';
      } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
        studentType = 'PG';
      } else if (pgFirstSem2025) {
        studentType = 'PG2025';
      } else if (ugStudent) {
        studentType = 'UG';
      } else if (ugFirstSem2025) {
        studentType = 'UG2025';
      } else {
        console.error('Student not found in any collection:', autonomousRollNo);
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log('Detected student type:', studentType);
    }

    // Normalize studentType (handle case sensitivity and whitespace)
    const normalizedStudentType = studentType.trim().toUpperCase();
    console.log('Student type check:', { 
      original: studentType, 
      normalized: normalizedStudentType 
    });

    let student;
    
    switch (normalizedStudentType) {
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
      case 'UG2025':
        student = await UGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        break;
      case 'PG2025':
        student = await PGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        break;
      default:
        console.error('Invalid student type received:', {
          studentType,
          normalizedStudentType,
          reqUser: req.user
        });
        return res.status(400).json({ 
          message: 'Invalid student type',
          received: studentType,
          expected: ['UG', 'PG', 'BBA', 'UG2025', 'PG2025']
        });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Add ABC_ID and profileImage to response
    const studentData = student.toObject();
    studentData.ABC_ID = student.ABC_ID || null;
    studentData.profileImage = student.profileImage || null;

    res.json(studentData);

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
    const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
      UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
      UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
      PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
    ]);

    let result = null;
    let studentType = null;

    // Determine the correct student type based on priority: BBA > PG > PGFirstSem2025 > UG > UGFirstSem2025
    if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
      result = bbaStudent;
      studentType = 'BBA';
    } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
      result = pgStudent;
      studentType = 'PG';
    } else if (pgFirstSem2025) {
      result = pgFirstSem2025;
      studentType = 'PG2025';
    } else if (ugStudent) {
      result = ugStudent;
      studentType = 'UG';
    } else if (ugFirstSem2025) {
      result = ugFirstSem2025;
      studentType = 'UG2025';
    }

    if (!result) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      studentType,
      student: result,
      ABC_ID: result.ABC_ID || null
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/students/bulk-update-dob
// @desc    Bulk update student DOB using College Roll No
// @access  Public (consider securing this endpoint before production use)
router.post('/bulk-update-dob', async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : req.body?.students;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({
        message: 'Request body must be an array of student records or an object with a students array'
      });
    }

    const summary = {
      total: payload.length,
      updated: 0,
      modifiedDocs: 0,
      notFound: [],
      skipped: [],
      errors: []
    };

    for (const entry of payload) {
      try {
        const rollNo =
          entry?.CollegeRollNo ||
          entry?.['College Roll No'] ||
          entry?.RollNo ||
          entry?.['Roll No'];

        const dob =
          entry?.DateOfBirth ||
          entry?.['DateOfBirth'] ||
          entry?.DOB ||
          entry?.['DOB'];

        if (!rollNo || !dob) {
          summary.skipped.push({
            entry,
            reason: 'Missing CollegeRollNo/RollNo or DateOfBirth/DOB'
          });
          continue;
        }

        const updates = [
          {
            model: PGStudent,
            query: { 'College Roll No': rollNo },
            update: { $set: { DOB: dob } }
          },
          {
            model: UGStudent,
            query: { 'Roll No': rollNo },
            update: { $set: { dob } }
          },
          {
            model: BBAStudent,
            query: { 'Roll No': rollNo },
            update: { $set: { dob } }
          },
          {
            model: UGFirstSem2025,
            query: { 'Roll No': rollNo },
            update: { $set: { dob } }
          },
          {
            model: PGFirstSem2025,
            query: { 'College Roll No': rollNo },
            update: { $set: { dob: dob } }
          }
        ];

        let matched = 0;
        let modified = 0;

        for (const { model, query, update } of updates) {
          const result = await model.updateOne(query, update);
          matched += result.matchedCount || 0;
          modified += result.modifiedCount || 0;
        }

        if (matched === 0) {
          summary.notFound.push({ rollNo, dob });
          continue;
        }

        summary.updated += matched;
        summary.modifiedDocs += modified;
      } catch (innerError) {
        console.error(`Failed to process entry`, innerError);
        summary.errors.push({
          entry,
          error: innerError.message || 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Bulk DOB update completed',
      summary
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/students/test-upload-route
// @desc    Test route to verify upload-image route exists
// @access  Public
router.get('/test-upload-route', (req, res) => {
  res.json({ message: 'Upload route is accessible', path: '/api/students/upload-image' });
});

// @route   POST /api/students/upload-image
// @desc    Upload/update student profile image
// @access  Private
router.post('/upload-image', auth, async (req, res) => {
  console.log('Upload image route hit', { 
    user: req.user,
    bodyKeys: Object.keys(req.body),
    hasImage: !!req.body.image 
  }); // Debug log
  
  try {
    let { autonomousRollNo, studentType } = req.user;
    
    // If studentType is missing or invalid, try to detect it
    if (!studentType || !['UG', 'PG', 'BBA'].includes(studentType.toUpperCase())) {
      console.log('StudentType missing, detecting from roll number');
      const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
        UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo })
      ]);

      if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
        studentType = 'BBA';
      } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
        studentType = 'PG';
      } else if (ugStudent) {
        studentType = 'UG';
      } else {
        return res.status(404).json({ message: 'Student not found' });
      }
    }
    
    const normalizedStudentType = studentType.trim().toUpperCase();
    const { image } = req.body; // Base64 encoded image string

    if (!image) {
      console.log('No image provided in request body');
      return res.status(400).json({ message: 'Image data is required' });
    }

    if (!image.startsWith('data:image/')) {
      console.log('Invalid image format:', image.substring(0, 50));
      return res.status(400).json({ message: 'Invalid image data. Please provide a valid base64 image.' });
    }

    let student;
    
    switch (normalizedStudentType) {
      case 'UG':
        student = await UGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = image;
          await student.save();
        }
        break;
      case 'PG':
        student = await PGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = image;
          await student.save();
        }
        break;
      case 'BBA':
        student = await BBAStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = image;
          await student.save();
        }
        break;
      case 'UG2025':
        student = await UGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = image;
          await student.save();
        }
        break;
      case 'PG2025':
        student = await PGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = image;
          await student.save();
        }
        break;
      default:
        return res.status(400).json({ message: 'Invalid student type' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ 
      message: 'Profile image uploaded successfully',
      profileImage: student.profileImage 
    });

  } catch (error) {
    console.error('Error uploading image:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/students/delete-image
// @desc    Delete student profile image
// @access  Private
router.delete('/delete-image', auth, async (req, res) => {
  try {
    let { autonomousRollNo, studentType } = req.user;
    
    // If studentType is missing or invalid, try to detect it
    if (!studentType || !['UG', 'PG', 'BBA', 'UG2025', 'PG2025'].includes(studentType.toUpperCase())) {
      console.log('StudentType missing, detecting from roll number');
      const [ugStudent, pgStudent, bbaStudent, ugFirstSem2025, pgFirstSem2025] = await Promise.all([
        UGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        PGStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        BBAStudent.findOne({ "Autonomous Roll No": autonomousRollNo }),
        UGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo }),
        PGFirstSem2025.findOne({ "Autonomous Roll No": autonomousRollNo })
      ]);

      if (bbaStudent && (bbaStudent["Department"] === "BBA " || bbaStudent["Roll No"]?.startsWith("BBA-"))) {
        studentType = 'BBA';
      } else if (pgStudent && (pgStudent["Course"] || pgStudent["Graduation Board"])) {
        studentType = 'PG';
      } else if (pgFirstSem2025) {
        studentType = 'PG2025';
      } else if (ugStudent) {
        studentType = 'UG';
      } else if (ugFirstSem2025) {
        studentType = 'UG2025';
      } else {
        return res.status(404).json({ message: 'Student not found' });
      }
    }
    
    const normalizedStudentType = studentType.trim().toUpperCase();

    let student;
    
    switch (normalizedStudentType) {
      case 'UG':
        student = await UGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = null;
          await student.save();
        }
        break;
      case 'PG':
        student = await PGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = null;
          await student.save();
        }
        break;
      case 'BBA':
        student = await BBAStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = null;
          await student.save();
        }
        break;
      case 'UG2025':
        student = await UGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = null;
          await student.save();
        }
        break;
      case 'PG2025':
        student = await PGFirstSem2025.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });
        if (student) {
          student.profileImage = null;
          await student.save();
        }
        break;
      default:
        return res.status(400).json({ message: 'Invalid student type' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Profile image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
