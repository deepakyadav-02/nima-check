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
         // Support multiple formats: autonomousRollNo (from API), AutonomousRollNo (camelCase), or Autonomous Roll No (with spaces)
         const rollNo = marksheetData.autonomousRollNo || marksheetData.AutonomousRollNo || marksheetData['Autonomous Roll No'];
        
        if (!rollNo && !marksheetData.studentId) {
          results.failed.push({
            index: i,
            data: marksheetData,
            error: 'Either autonomousRollNo/AutonomousRollNo or studentId is required'
          });
          continue;
        }

        // OPTIMIZATION: Find student in all collections in parallel
        let student = null;
        let studentType = 'UGStudent';
        
        if (marksheetData.studentId) {
          // Try to find in all collections in parallel
          const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
            UGStudent.findById(marksheetData.studentId),
            PGStudent.findById(marksheetData.studentId),
            BBAStudent.findById(marksheetData.studentId)
          ]);
          
          if (ugStudent) {
            student = ugStudent;
            studentType = 'UGStudent';
          } else if (pgStudent) {
            student = pgStudent;
            studentType = 'PGStudent';
          } else if (bbaStudent) {
            student = bbaStudent;
            studentType = 'BBAStudent';
          }
        } else {
          // Search by Autonomous Roll No in all collections in parallel
          const [ugStudent, pgStudent, bbaStudent] = await Promise.all([
            UGStudent.findOne({ "Autonomous Roll No": rollNo }),
            PGStudent.findOne({ "Autonomous Roll No": rollNo }),
            BBAStudent.findOne({ "Autonomous Roll No": rollNo })
          ]);
          
          if (ugStudent) {
            student = ugStudent;
            studentType = 'UGStudent';
          } else if (pgStudent) {
            student = pgStudent;
            studentType = 'PGStudent';
          } else if (bbaStudent) {
            student = bbaStudent;
            studentType = 'BBAStudent';
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

          // Include optional fields if present (support both UG and PG formats)
          if (course.theory !== undefined) normalized.theory = course.theory;
          if (course.internal !== undefined) normalized.internal = course.internal;
          if (course.midsem !== undefined) normalized.midsem = course.midsem; // PG format
          if (course.endsem !== undefined) normalized.endsem = course.endsem; // PG format
          if (course.practical !== undefined) normalized.practical = course.practical;
          if (course.grade !== undefined) normalized.grade = course.grade;
          if (course.gradePoint !== undefined) normalized.gradePoint = course.gradePoint;
          if (course.creditPoint !== undefined) normalized.creditPoint = course.creditPoint;
          if (course.percentage !== undefined) normalized.percentage = course.percentage;
          if (course._id) normalized._id = course._id;

          return normalized;
        });

        // Use calculated values directly from final.json
        const totalCredits = marksheetData.totalCredits;
        const totalCreditPoints = marksheetData.totalCreditPoints;
        const sgpa = marksheetData.sgpa;
        const percentage = marksheetData.percentage;
        const classification = marksheetData.classification;
        const department = marksheetData.department || null; // Store department from JSON

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
          if (department) marksheet.department = department;
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
            department,
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

// Simple in-memory cache (can be replaced with Redis for production)
const marksheetCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 1000;

// Periodic cache cleanup to avoid checking on every request
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of marksheetCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      marksheetCache.delete(key);
      cleanedCount++;
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (marksheetCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(marksheetCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, marksheetCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => marksheetCache.delete(key));
    cleanedCount += toRemove.length;
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cache cleanup: Removed ${cleanedCount} expired entries`);
  }
}, CACHE_CLEANUP_INTERVAL);

// @route   GET /api/marksheet/autonomous/:autonomousRollNo
// @desc    Get all marksheets by autonomous roll number
// @access  Public
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const autonomousRollNo = req.params.autonomousRollNo;
    
    // Check cache first
    const cacheKey = `marksheet_${autonomousRollNo}`;
    const cached = marksheetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }
    
    // OPTIMIZATION 1: Run all student queries in parallel
    const [ugStudents, pgStudents, bbaStudents] = await Promise.all([
      UGStudent.find({ "Autonomous Roll No": autonomousRollNo }),
      PGStudent.find({ "Autonomous Roll No": autonomousRollNo }),
      BBAStudent.find({ "Autonomous Roll No": autonomousRollNo })
    ]);

    // Collect all student IDs from all collections
    const allUGIds = ugStudents.map(s => s._id);
    const allPGIds = pgStudents.map(s => s._id);
    const allBBAIds = bbaStudents.map(s => s._id);
    const allStudentIds = [...allUGIds, ...allPGIds, ...allBBAIds];

    if (allStudentIds.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // OPTIMIZATION 2: Run all marksheet queries in parallel
    const [bbaMarksheets, pgMarksheets, ugMarksheets] = await Promise.all([
      allBBAIds.length > 0 ? UGMarksheet.find({ 
        student: { $in: allBBAIds },
        studentType: 'BBAStudent'
      }).sort({ semester: 1 }).lean() : Promise.resolve([]),
      allPGIds.length > 0 ? UGMarksheet.find({ 
        student: { $in: allPGIds },
        studentType: 'PGStudent'
      }).sort({ semester: 1 }).lean() : Promise.resolve([]),
      allUGIds.length > 0 ? UGMarksheet.find({ 
        student: { $in: allUGIds },
        studentType: 'UGStudent'
      }).sort({ semester: 1 }).lean() : Promise.resolve([])
    ]);

    // Determine which student type has marksheets (priority: BBA > PG > UG)
    let marksheets = null;
    let studentType = null;
    let student = null;
    let studentIds = null;

    if (bbaMarksheets && bbaMarksheets.length > 0) {
      marksheets = bbaMarksheets;
      studentType = 'BBAStudent';
      student = bbaStudents[0];
      studentIds = allBBAIds;
    } else if (pgMarksheets && pgMarksheets.length > 0) {
      marksheets = pgMarksheets;
      studentType = 'PGStudent';
      student = pgStudents[0];
      studentIds = allPGIds;
    } else if (ugMarksheets && ugMarksheets.length > 0) {
      marksheets = ugMarksheets;
      studentType = 'UGStudent';
      student = ugStudents[0];
      studentIds = allUGIds;
    }

    // If no marksheets found, determine student type from which collection has the student
    if (!marksheets || marksheets.length === 0) {
      if (bbaStudents.length > 0) {
        studentType = 'BBAStudent';
        student = bbaStudents[0];
        studentIds = allBBAIds;
      } else if (pgStudents.length > 0) {
        studentType = 'PGStudent';
        student = pgStudents[0];
        studentIds = allPGIds;
      } else if (ugStudents.length > 0) {
        studentType = 'UGStudent';
        student = ugStudents[0];
        studentIds = allUGIds;
      }
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // OPTIMIZATION 3: Only populate if marksheets exist, and do it once
    if (marksheets && marksheets.length > 0 && studentIds) {
      // Populate marksheets with student data in a single query
      marksheets = await UGMarksheet.find({ 
        student: { $in: studentIds },
        studentType: studentType
      })
      .populate({
        path: 'student',
        select: 'Autonomous Roll No "Name of the Students" Applicant Name Department Course "Roll No" "College Roll No"'
      })
      .sort({ semester: 1 })
      .lean();
    }

    if (!marksheets || marksheets.length === 0) {
      const studentName = student["Name of the Students"] || student["Applicant Name"] || 'N/A';
      const response = { 
        message: 'No marksheets found for this student',
        student: {
          name: studentName,
          autonomousRollNo: student["Autonomous Roll No"],
          department: student.Department || student.Course || 'N/A',
          studentType: studentType
        }
      };
      
      // Cache the response even if no marksheets found (shorter TTL for negative results)
      marksheetCache.set(cacheKey, { data: response, timestamp: Date.now() });
      
      return res.status(404).json(response);
    }

    // Extract student info from populated marksheet or use the found student
    const marksheetStudent = marksheets[0].student || student;
    const studentName = marksheetStudent["Name of the Students"] || marksheetStudent["Applicant Name"] || 'N/A';
    const rollNo = marksheetStudent["Roll No"] || 
                   marksheetStudent["College Roll No"] || 
                   'N/A';
    
    const response = {
      student: {
        name: studentName,
        autonomousRollNo: marksheetStudent["Autonomous Roll No"] || autonomousRollNo,
        rollNo: rollNo,
        department: marksheetStudent.Department || marksheetStudent.Course || 'N/A',
        studentType: studentType
      },
      marksheets
    };
    
    // Cache the response
    marksheetCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    res.json(response);
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

