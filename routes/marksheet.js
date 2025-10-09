const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const UGStudent = require('../models/UGStudent');
const UGMarksheet = require('../models/UGMarksheet');

// Helper function to calculate grade and grade point based on marks
const calculateGrade = (marks) => {
  if (marks >= 90) return { grade: 'O', gradePoint: 10 };
  if (marks >= 80) return { grade: 'A+', gradePoint: 9 };
  if (marks >= 70) return { grade: 'A', gradePoint: 8 };
  if (marks >= 60) return { grade: 'B+', gradePoint: 7 };
  if (marks >= 50) return { grade: 'B', gradePoint: 6 };
  if (marks >= 40) return { grade: 'C', gradePoint: 5 };
  if (marks >= 35) return { grade: 'P', gradePoint: 4 };
  return { grade: 'F', gradePoint: 0 };
};

// Helper function to calculate classification based on SGPA
const calculateClassification = (sgpa) => {
  if (sgpa >= 9.5) return 'Outstanding';
  if (sgpa >= 8.5) return 'Excellent';
  if (sgpa >= 7.5) return 'Very Good';
  if (sgpa >= 6.5) return 'Good';
  if (sgpa >= 5.5) return 'Above Average';
  if (sgpa >= 5.0) return 'Fair';
  if (sgpa >= 4.0) return 'Pass';
  return 'Fail';
};

// Helper function to process marksheet and calculate totals
const processMarksheet = (courses) => {
  let totalCredits = 0;
  let totalCreditPoints = 0;

  const processedCourses = courses.map(course => {
    // Calculate total marks from theory, internal, and practical
    let totalMarks = 0;
    
    const result = {
      subjectName: course.subjectName,
      courseType: course.courseType,
      credit: course.credit
    };
    
    console.log('Processing course:', course.subjectName, 'Marks type:', typeof course.marks, 'Marks:', course.marks);
    
    if (typeof course.marks === 'object' && course.marks !== null) {
      // Has breakdown - store individual components
      const theory = course.marks.theory !== undefined ? course.marks.theory : 0;
      const internal = course.marks.internal !== undefined ? course.marks.internal : 0;
      const practical = course.marks.practical !== undefined ? course.marks.practical : 0;
      
      result.theory = theory;
      result.internal = internal;
      result.practical = practical;
      totalMarks = theory + internal + practical;
      
      console.log('Breakdown stored:', { theory, internal, practical, total: totalMarks });
    } else {
      // No breakdown - just total marks
      totalMarks = course.marks;
      console.log('No breakdown, total marks:', totalMarks);
    }

    const { grade, gradePoint } = calculateGrade(totalMarks);
    const creditPoint = course.credit * gradePoint;

    totalCredits += course.credit;
    totalCreditPoints += creditPoint;

    result.marks = totalMarks;
    result.grade = course.grade || grade;
    result.gradePoint = course.gradePoint !== undefined ? course.gradePoint : gradePoint;
    result.creditPoint = course.creditPoint !== undefined ? course.creditPoint : creditPoint;

    console.log('Final result object:', result);
    return result;
  });

  const sgpa = totalCredits > 0 ? parseFloat((totalCreditPoints / totalCredits).toFixed(2)) : 0;
  
  // Calculate percentage based on SGPA
  let percentage = 0;
  if (sgpa > 4.5) {
    percentage = parseFloat(((sgpa - 0.5) * 10).toFixed(2));
  } else {
    percentage = parseFloat((sgpa * 10).toFixed(2));
  }
  
  const classification = calculateClassification(sgpa);

  return {
    processedCourses,
    totalCredits,
    totalCreditPoints: parseFloat(totalCreditPoints.toFixed(2)),
    sgpa: parseFloat(sgpa),
    percentage: parseFloat(percentage),
    classification
  };
};

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
        // Validate required fields
        if (!marksheetData.autonomousRollNo && !marksheetData.studentId) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Either autonomousRollNo or studentId is required'
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

        // Find student by autonomousRollNo or studentId
        let student;
        if (marksheetData.studentId) {
          student = await UGStudent.findById(marksheetData.studentId);
        } else {
          student = await UGStudent.findOne({ 
            "Autonomous Roll No": marksheetData.autonomousRollNo 
          });
        }

        if (!student) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Student not found'
          });
          continue;
        }

        // Process courses and calculate totals
        const {
          processedCourses,
          totalCredits,
          totalCreditPoints,
          sgpa,
          percentage,
          classification
        } = processMarksheet(marksheetData.courses);

        // Check if marksheet already exists for this student and semester
        let marksheet = await UGMarksheet.findOne({
          student: student._id,
          semester: marksheetData.semester
        });

        if (marksheet) {
          // Update existing marksheet
          marksheet.courses = processedCourses;
          marksheet.totalCredits = totalCredits;
          marksheet.totalCreditPoints = totalCreditPoints;
          marksheet.sgpa = sgpa;
          marksheet.percentage = percentage;
          marksheet.classification = classification;
          marksheet.updatedBy = createdBy || req.user.name || 'admin';
          
          await marksheet.save();
          
          results.success.push({
            index: i,
            action: 'updated',
            studentName: student["Name of the Students"],
            autonomousRollNo: student["Autonomous Roll No"],
            semester: marksheetData.semester,
            marksheetId: marksheet._id
          });
        } else {
          // Create new marksheet
          marksheet = new UGMarksheet({
            student: student._id,
            semester: marksheetData.semester,
            courses: processedCourses,
            totalCredits,
            totalCreditPoints,
            sgpa,
            percentage,
            classification,
            createdBy: createdBy || req.user.name || 'admin'
          });

          await marksheet.save();

          results.success.push({
            index: i,
            action: 'created',
            studentName: student["Name of the Students"],
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
    .populate('student', 'Autonomous Roll No Name of the Students Department')
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
    const student = await UGStudent.findOne({ 
      "Autonomous Roll No": req.params.autonomousRollNo 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const marksheets = await UGMarksheet.find({ 
      student: student._id 
    })
    .populate('student')
    .sort({ semester: 1 });

    if (!marksheets || marksheets.length === 0) {
      return res.status(404).json({ 
        message: 'No marksheets found for this student',
        student: {
          name: student["Name of the Students"],
          autonomousRollNo: student["Autonomous Roll No"],
          department: student.Department
        }
      });
    }
    res.json({
      student: {
        name: student["Name of the Students"],
        autonomousRollNo: student["Autonomous Roll No"],
        rollNo: student["Roll No"],
        department: student.Department
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
      .populate('student', 'Autonomous Roll No Name of the Students Department');

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

