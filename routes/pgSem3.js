const express = require('express');
const router = express.Router();
const PGSem3Result = require('../models/PGSem3Result');

// @route   GET /api/pg-sem3/autonomous/:autonomousRollNo
// @desc    Get 3rd sem PG result by autonomous roll number
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const result = await PGSem3Result.findOne({
      autonomousRollNo: req.params.autonomousRollNo,
    });

    if (!result) {
      return res.status(404).json({ message: '3rd semester PG result not found' });
    }

    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pg-sem3/roll/:rollNo
// @desc    Get 3rd sem PG result by college roll number
router.get('/roll/:rollNo', async (req, res) => {
  try {
    const result = await PGSem3Result.findOne({
      rollNo: req.params.rollNo,
    });

    if (!result) {
      return res.status(404).json({ message: '3rd semester PG result not found' });
    }

    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pg-sem3
// @desc    List all 3rd sem PG results (optional department filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const results = await PGSem3Result.find(filter)
      .select('rollNo autonomousRollNo studentName department percentage grade classification')
      .sort({ department: 1, rollNo: 1 });

    res.json({
      count: results.length,
      results,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
