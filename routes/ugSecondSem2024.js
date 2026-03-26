const express = require('express');
const router = express.Router();

const UGSecondSem2024 = require('../models/UGSecondSem2024');

// @route   GET /api/ug-2ndsem2024/autonomous/:autonomousRollNo
// @desc    Get UG 2nd semester (2024) record by autonomous roll number
// @access  Public (matches existing marksheet fetch pattern)
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const autonomousRollNo = req.params.autonomousRollNo?.trim();

    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    const doc = await UGSecondSem2024.findOne({ 'Autonomous Roll No': autonomousRollNo }).lean();

    if (!doc) {
      return res.status(404).json({ message: '2nd semester record not found' });
    }

    return res.json(doc);
  } catch (error) {
    console.error('Error fetching UGSecondSem2024:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

