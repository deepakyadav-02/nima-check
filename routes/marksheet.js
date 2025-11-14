const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGMarksheet = require('../models/UGMarksheet');

// @route   POST /api/marksheet/bulk-upload
// @desc    Bulk upload marks for multiple students
// @access  Private (Admin only)
router.post('/bulk-upload', adminAuth, async (req, res) => {
  try {
    const { marksheets, createdBy } = req.body;

    if (!marksheets || !Array.isArray(marksheets) || marksheets.length === 0) {
      return res.status(400).json({ 
        message: 'Marksheets array is required and must not be empty' 
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Process each marksheet
    for (let i = 0; i < marksheets.length; i++) {
      const marksheetData = marksheets[i];
      
      try {
        // Validate required fields - support both formats
        if (!marksheetData.autonomousRollNo && !marksheetData.AutonomousRollNo && !marksheetData.studentId) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Either autonomousRollNo/AutonomousRollNo or studentId is required'
          });
          continue;
        }

        if (!marksheetData.semester) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Semester is required'
          });
          continue;
        }

        if (!marksheetData.courses || !Array.isArray(marksheetData.courses) || marksheetData.courses.length === 0) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Courses array is required and must not be empty'
          });
          continue;
        }

        // Find student by autonomousRollNo (from final.json format: AutonomousRollNo)
        // Support both formats: autonomousRollNo (from API) or AutonomousRollNo (from final.json)
        const rollNo = marksheetData.autonomousRollNo || marksheetData.AutonomousRollNo;
        
        if (!rollNo && !marksheetData.studentId) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Either autonomousRollNo/AutonomousRollNo or studentId is required'
          });
          continue;
        }

        // Find student in UG, PG, or BBA collections
        let student = null;
        let studentType = 'UGStudent';
        
        if (marksheetData.studentId) {
          // Try to find in all collections
          student = await UGStudent.findById(marksheetData.studentId);
          if (student) {
            studentType = 'UGStudent';
          } else {
            student = await PGStudent.findById(marksheetData.studentId);
            if (student) {
              studentType = 'PGStudent';
            } else {
              student = await BBAStudent.findById(marksheetData.studentId);
              if (student) {
                studentType = 'BBAStudent';
              }
            }
          }
        } else {
          // Search by Autonomous Roll No in all collections
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
        }

        if (!student) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: `Student not found for roll number: ${rollNo}`
          });
          continue;
        }

        // Use data directly from final.json (all calculations already done)
        // Normalize courses to ensure all fields are present
        const processedCourses = marksheetData.courses.map((course) => {
          const normalized = {
            subjectName: course.subjectName,
            courseType: course.courseType,
            credit: course.credit,
            marks: course.marks
          };

          // Include optional fields if present
          if (course.theory !== undefined) normalized.theory = course.theory;
          if (course.internal !== undefined) normalized.internal = course.internal;
          if (course.practical !== undefined) normalized.practical = course.practical;
          if (course.grade !== undefined) normalized.grade = course.grade;
          if (course.gradePoint !== undefined) normalized.gradePoint = course.gradePoint;
          if (course.creditPoint !== undefined) normalized.creditPoint = course.creditPoint;
          if (course._id) normalized._id = course._id;

          return normalized;
        });

        // Use calculated values directly from final.json
        const totalCredits = marksheetData.totalCredits;
        const totalCreditPoints = marksheetData.totalCreditPoints;
        const sgpa = marksheetData.sgpa;
        const percentage = marksheetData.percentage;
        const classification = marksheetData.classification;

        const createdByValue = marksheetData.createdBy || createdBy || req.user?.name || 'admin';
        const updatedByValue = marksheetData.updatedBy || createdByValue;

        // Check if marksheet already exists for this student and semester
        let marksheet = await UGMarksheet.findOne({
          student: student._id,
          studentType: studentType,
          semester: marksheetData.semester
        });

        if (marksheet) {
          // Update existing marksheet
          marksheet.studentType = studentType;
          marksheet.courses = processedCourses;
          marksheet.totalCredits = totalCredits;
          marksheet.totalCreditPoints = totalCreditPoints;
          marksheet.sgpa = sgpa;
          marksheet.percentage = percentage;
          marksheet.classification = classification;
          marksheet.updatedBy = updatedByValue;
          
          await marksheet.save();
          
          const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
          results.success.push({
            index: i,
            action: 'updated',
            studentName: studentName,
            studentType: studentType,
            autonomousRollNo: student["Autonomous Roll No"],
            semester: marksheetData.semester,
            marksheetId: marksheet._id
          });
        } else {
          // Create new marksheet
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
            createdBy: createdByValue,
            updatedBy: updatedByValue
          });

          await marksheet.save();

          const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
          results.success.push({
            index: i,
            action: 'created',
            studentName: studentName,
            studentType: studentType,
            autonomousRollNo: student["Autonomous Roll No"],
            semester: marksheetData.semester,
            marksheetId: marksheet._id
          });
        }

      } catch (error) {
        results.failed.push({
          index: i,
          data: marksheetData,
          error: error.message
        });
      }
    }

    // Send response
    res.json({
      message: 'Bulk upload completed',
      summary: {
        total: marksheets.length,
        successful: results.success.length,
        failed: results.failed.length
      },
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error.message);
    res.status(500).json({ 
      message: 'Server error during bulk upload',
      error: error.message 
    });
  }
});

// @route   GET /api/marksheet/student/:studentId
// @desc    Get all marksheets for a student
// @access  Public
router.get('/student/:studentId', async (req, res) => {
  try {
    const marksheets = await UGMarksheet.find({ 
      student: req.params.studentId 
    })
    .populate({
      path: 'student',
      select: 'Autonomous Roll No "Name of the Students" Applicant Name Department'
    })
    .sort({ semester: 1 });

    if (!marksheets || marksheets.length === 0) {
      return res.status(404).json({ message: 'No marksheets found for this student' });
    }

    res.json(marksheets);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/marksheet/autonomous/:autonomousRollNo
// @desc    Get all marksheets by autonomous roll number
// @access  Public
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    // Search in all three collections
    let student = await UGStudent.findOne({ 
      "Autonomous Roll No": req.params.autonomousRollNo 
    });
    let studentType = 'UGStudent';
    
    if (!student) {
      student = await PGStudent.findOne({ 
        "Autonomous Roll No": req.params.autonomousRollNo 
      });
      if (student) {
        studentType = 'PGStudent';
      } else {
        student = await BBAStudent.findOne({ 
          "Autonomous Roll No": req.params.autonomousRollNo 
        });
        if (student) {
          studentType = 'BBAStudent';
        }
      }
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const marksheets = await UGMarksheet.find({ 
      student: student._id,
      studentType: studentType
    })
    .populate({
      path: 'student',
      select: 'Autonomous Roll No "Name of the Students" Applicant Name Department "Roll No"'
    })
    .sort({ semester: 1 });

    if (!marksheets || marksheets.length === 0) {
      const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
      return res.status(404).json({ 
        message: 'No marksheets found for this student',
        student: {
          name: studentName,
          autonomousRollNo: student["Autonomous Roll No"],
          department: student.Department,
          studentType: studentType
        }
      });
    }
    
    const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
    res.json({
      student: {
        name: studentName,
        autonomousRollNo: student["Autonomous Roll No"],
        rollNo: student["Roll No"] || student["College Roll No"] || 'N/A',
        department: student.Department,
        studentType: studentType
      },
      marksheets
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const marksheet = await UGMarksheet.findById(req.params.id)
      .populate({
        path: 'student',
        select: 'Autonomous Roll No "Name of the Students" Applicant Name Department'
      });

    if (!marksheet) {
      return res.status(404).json({ message: 'Marksheet not found' });
    }
    res.json(marksheet);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const marksheet = await UGMarksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ message: 'Marksheet not found' });
    }
    await marksheet.deleteOne();
    res.json({ message: 'Marksheet deleted successfully' });
  
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/all/clear', adminAuth, async (req, res) => {
  try {
    const result = await UGMarksheet.deleteMany({});
    res.json({ 
      message: 'All marksheets deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

