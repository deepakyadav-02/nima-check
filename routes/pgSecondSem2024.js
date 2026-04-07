const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// @route   GET /api/pg-2ndsem2024/autonomous/:autonomousRollNo
// @desc    Get PG 2nd semester record by autonomous roll number
// @access  Public (matches UG 2nd sem fetch pattern)
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const autonomousRollNo = req.params.autonomousRollNo?.trim();

    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    const doc = await mongoose.connection.db
      .collection('pg2ndsem2024')
      .findOne({ autonomousRollNo });

    if (!doc) {
      return res.status(404).json({ message: 'PG 2nd semester record not found' });
    }

    return res.json(doc);
  } catch (error) {
    console.error('Error fetching PGSecondSem2024:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
