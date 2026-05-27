const express = require('express');
const router = express.Router();
const PGAllSemesters = require('../models/PGAllSemesters');
const { enrichPGAllSemestersDoc } = require('../utils/pgOverallMarks');

const rollFilter = (autonomousRollNo) => ({
  autonomousRollNo: autonomousRollNo.trim(),
});

// @route   GET /api/pg/all-semesters/autonomous/:autonomousRollNo
// @desc    Get all 4 PG semesters + overall grand total (sem1+sem2+sem3+sem4)
router.get('/autonomous/:autonomousRollNo', async (req, res) => {
  try {
    const autonomousRollNo = req.params.autonomousRollNo?.trim();
    if (!autonomousRollNo) {
      return res.status(400).json({ message: 'Autonomous Roll No is required' });
    }

    const result = await PGAllSemesters.findOne(rollFilter(autonomousRollNo));

    if (!result) {
      return res.status(404).json({ message: 'PG student record not found' });
    }

    return res.json(enrichPGAllSemestersDoc(result));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pg/all-semesters/roll/:rollNo
router.get('/roll/:rollNo', async (req, res) => {
  try {
    const rollNo = req.params.rollNo?.trim();
    if (!rollNo) {
      return res.status(400).json({ message: 'Roll No is required' });
    }

    const result = await PGAllSemesters.findOne({ rollNo });

    if (!result) {
      return res.status(404).json({ message: 'PG student record not found' });
    }

    return res.json(enrichPGAllSemestersDoc(result));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pg/all-semesters
// @desc    List PG students with overall summary; optional ?department=ODIA
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const results = await PGAllSemesters.find(filter).sort({ department: 1, rollNo: 1 });

    const list = results.map((doc) => {
      const enriched = enrichPGAllSemestersDoc(doc);
      return {
        autonomousRollNo: enriched.autonomousRollNo,
        rollNo: enriched.rollNo,
        registrationNumber: enriched.registrationNumber,
        studentName: enriched.studentName,
        department: enriched.department,
        grandTotal: enriched.grandTotal,
        maximumMark: enriched.maximumMark,
        percentage: enriched.percentage,
      };
    });

    return res.json({ count: list.length, results: list });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
