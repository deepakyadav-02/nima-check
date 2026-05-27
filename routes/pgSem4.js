const express = require('express');
const router = express.Router();
const PGSem4Result = require('../models/PGSem4Result');

router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const result = await PGSem4Result.findOne({
      autonomousRollNo: req.params.autonomousRollNo,
    });

    if (!result) {
      return res.status(404).json({ message: '4th semester PG result not found' });
    }

    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/roll/:rollNo', async (req, res) => {
  try {
    const result = await PGSem4Result.findOne({
      rollNo: req.params.rollNo,
    });

    if (!result) {
      return res.status(404).json({ message: '4th semester PG result not found' });
    }

    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const results = await PGSem4Result.find(filter)
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
