const express = require('express');
const router = express.Router();
const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');

// @route   POST /api/data-import/ug-students
// @desc    Import all UG students data
// @access  Public
router.post('/ug-students', async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // Clear existing data
    await UGStudent.deleteMany({});

    // Insert new data
    const result = await UGStudent.insertMany(students);

    res.json({
      message: `${result.length} UG students imported successfully`,
      count: result.length
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/data-import/pg-students
// @desc    Import all PG students data
// @access  Public
router.post('/pg-students', async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // Clear existing data
    await PGStudent.deleteMany({});

    // Insert new data
    const result = await PGStudent.insertMany(students);

    res.json({
      message: `${result.length} PG students imported successfully`,
      count: result.length
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/data-import/bba-students
// @desc    Import all BBA students data
// @access  Public
router.post('/bba-students', async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // Clear existing data
    await BBAStudent.deleteMany({});

    // Insert new data
    const result = await BBAStudent.insertMany(students);

    res.json({
      message: `${result.length} BBA students imported successfully`,
      count: result.length
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/data-import/all-students
// @desc    Import all students data to all models at once
// @access  Public
router.post('/all-students', async (req, res) => {
  try {
    const { ugStudents, pgStudents, bbaStudents } = req.body;

    const results = {};

    // Import UG Students
    if (ugStudents && Array.isArray(ugStudents)) {
      await UGStudent.deleteMany({});
      const ugResult = await UGStudent.insertMany(ugStudents);
      results.ug = {
        message: `${ugResult.length} UG students imported successfully`,
        count: ugResult.length
      };
    }

    // Import PG Students
    if (pgStudents && Array.isArray(pgStudents)) {
      await PGStudent.deleteMany({});
      const pgResult = await PGStudent.insertMany(pgStudents);
      results.pg = {
        message: `${pgResult.length} PG students imported successfully`,
        count: pgResult.length
      };
    }

    // Import BBA Students
    if (bbaStudents && Array.isArray(bbaStudents)) {
      await BBAStudent.deleteMany({});
      const bbaResult = await BBAStudent.insertMany(bbaStudents);
      results.bba = {
        message: `${bbaResult.length} BBA students imported successfully`,
        count: bbaResult.length
      };
    }

    res.json({
      message: 'All students data imported successfully',
      results
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/data-import/ug-firstsem2025
// @desc    Import all UG First Sem 2025 students data
// @access  Public
router.post('/ug-firstsem2025', async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // Clear existing data
    await UGFirstSem2025.deleteMany({});

    // Insert new data
    const result = await UGFirstSem2025.insertMany(students);

    res.json({
      message: `${result.length} UG First Sem 2025 students imported successfully`,
      count: result.length
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/data-import/pg-firstsem2025
// @desc    Import all PG First Sem 2025 students data
// @access  Public
router.post('/pg-firstsem2025', async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // Clear existing data
    await PGFirstSem2025.deleteMany({});

    // Insert new data
    const result = await PGFirstSem2025.insertMany(students);

    res.json({
      message: `${result.length} PG First Sem 2025 students imported successfully`,
      count: result.length
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/data-import/status
// @desc    Get import status (count of students in each model)
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const [ugCount, pgCount, bbaCount, ugFirstSem2025Count, pgFirstSem2025Count] = await Promise.all([
      UGStudent.countDocuments(),
      PGStudent.countDocuments(),
      BBAStudent.countDocuments(),
      UGFirstSem2025.countDocuments(),
      PGFirstSem2025.countDocuments()
    ]);

    res.json({
      ugStudents: ugCount,
      pgStudents: pgCount,
      bbaStudents: bbaCount,
      ugFirstSem2025: ugFirstSem2025Count,
      pgFirstSem2025: pgFirstSem2025Count,
      totalStudents: ugCount + pgCount + bbaCount + ugFirstSem2025Count + pgFirstSem2025Count
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

