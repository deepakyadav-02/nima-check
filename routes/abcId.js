const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');
const ABCIDSubmission = require('../models/ABCIDSubmission');

// Helper function to get student model based on type
const getStudentModel = (studentType) => {
  switch (studentType) {
    case 'UG':
      return UGStudent;
    case 'PG':
      return PGStudent;
    case 'BBA':
      return BBAStudent;
    case 'UG2025':
      return UGFirstSem2025;
    case 'PG2025':
      return PGFirstSem2025;
    default:
      return null;
  }
};

// Helper function to get model name for mongoose ref
const getModelName = (studentType) => {
  switch (studentType) {
    case 'UG':
      return 'UGStudent';
    case 'PG':
      return 'PGStudent';
    case 'BBA':
      return 'BBAStudent';
    case 'UG2025':
      return 'UGFirstSem2025';
    case 'PG2025':
      return 'PGFirstSem2025';
    default:
      return null;
  }
};

// @route   POST /api/abc-id/submit
// @desc    Submit or update ABC ID for a student
// @access  Private (Student)
router.post('/submit', auth, async (req, res) => {
  try {
    const { ABC_ID } = req.body;
    const { autonomousRollNo, studentType } = req.user.user;

    if (!ABC_ID) {
      return res.status(400).json({ message: 'ABC_ID is required' });
    }

    // Validate ABC_ID format (customize as needed)
    if (ABC_ID.length < 5) {
      return res.status(400).json({ message: 'ABC_ID must be at least 5 characters' });
    }

    const StudentModel = getStudentModel(studentType);
    if (!StudentModel) {
      return res.status(400).json({ message: 'Invalid student type' });
    }

    // Find the student
    const student = await StudentModel.findOne({ 
      "Autonomous Roll No": autonomousRollNo 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if ABC_ID already exists for another student
    const existingSubmission = await ABCIDSubmission.findOne({ 
      ABC_ID,
      autonomousRollNo: { $ne: autonomousRollNo }
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: 'This ABC_ID is already registered by another student' 
      });
    }

    // Update student record with ABC_ID
    student.ABC_ID = ABC_ID;
    await student.save();

    // Create or update ABC_ID submission record
    let submission = await ABCIDSubmission.findOne({ 
      autonomousRollNo 
    });

    if (submission) {
      // Update existing submission
      submission.ABC_ID = ABC_ID;
      submission.updatedAt = new Date();
      await submission.save();

      return res.json({
        message: 'ABC_ID updated successfully',
        action: 'updated',
        submission
      });
    } else {
      // Create new submission
      submission = new ABCIDSubmission({
        studentId: student._id,
        studentType: getModelName(studentType),
        autonomousRollNo,
        studentName: student["Name of the Students"] || student["Applicant Name"],
        department: student.Department || student.Course,
        ABC_ID,
        status: 'submitted'
      });

      await submission.save();

      return res.json({
        message: 'ABC_ID submitted successfully',
        action: 'created',
        submission
      });
    }

  } catch (error) {
    console.error('ABC_ID submission error:', error.message);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/abc-id/my-submission
// @desc    Get current student's ABC_ID submission
// @access  Private (Student)
router.get('/my-submission', auth, async (req, res) => {
  try {
    const { autonomousRollNo, studentType } = req.user.user;

    const StudentModel = getStudentModel(studentType);
    if (!StudentModel) {
      return res.status(400).json({ message: 'Invalid student type' });
    }

    const student = await StudentModel.findOne({ 
      "Autonomous Roll No": autonomousRollNo 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const submission = await ABCIDSubmission.findOne({ 
      autonomousRollNo 
    });

    res.json({
      hasSubmitted: !!submission,
      ABC_ID: student.ABC_ID,
      submission
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/abc-id/submissions
// @desc    Get all ABC_ID submissions (Admin only)
// @access  Private (Admin)
router.get('/submissions', adminAuth, async (req, res) => {
  try {
    const { status, department, search } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { autonomousRollNo: new RegExp(search, 'i') },
        { studentName: new RegExp(search, 'i') },
        { ABC_ID: new RegExp(search, 'i') }
      ];
    }

    const submissions = await ABCIDSubmission.find(filter)
      .sort({ submittedAt: -1 });

    res.json({
      total: submissions.length,
      submissions
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/abc-id/submission/:autonomousRollNo
// @desc    Get ABC_ID submission by autonomous roll number
// @access  Public
router.get('/submission/:autonomousRollNo', async (req, res) => {
  try {
    const submission = await ABCIDSubmission.findOne({ 
      autonomousRollNo: req.params.autonomousRollNo 
    });

    if (!submission) {
      return res.status(404).json({ message: 'No ABC_ID submission found' });
    }

    res.json(submission);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/abc-id/verify/:id
// @desc    Verify or reject ABC_ID submission (Admin only)
// @access  Private (Admin)
router.patch('/verify/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status must be either "verified" or "rejected"' 
      });
    }

    const submission = await ABCIDSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    submission.status = status;
    submission.updatedAt = new Date();
    await submission.save();

    res.json({
      message: `ABC_ID ${status} successfully`,
      submission
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/abc-id/submission/:id
// @desc    Delete ABC_ID submission (Admin only)
// @access  Private (Admin)
router.delete('/submission/:id', adminAuth, async (req, res) => {
  try {
    const submission = await ABCIDSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Also remove ABC_ID from student record
    const StudentModel = mongoose.model(submission.studentType);
    await StudentModel.updateOne(
      { "Autonomous Roll No": submission.autonomousRollNo },
      { $set: { ABC_ID: null } }
    );

    await submission.deleteOne();

    res.json({ message: 'ABC_ID submission deleted successfully' });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/abc-id/stats
// @desc    Get ABC_ID submission statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const total = await ABCIDSubmission.countDocuments();
    const submitted = await ABCIDSubmission.countDocuments({ status: 'submitted' });
    const verified = await ABCIDSubmission.countDocuments({ status: 'verified' });
    const rejected = await ABCIDSubmission.countDocuments({ status: 'rejected' });

    // Get counts by department
    const byDepartment = await ABCIDSubmission.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      total,
      byStatus: {
        submitted,
        verified,
        rejected
      },
      byDepartment
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

