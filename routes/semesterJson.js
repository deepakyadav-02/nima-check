const express = require('express');
const mongoose = require('mongoose');
const { JSON_FOLDER_MAPPINGS } = require('../data/jsonCollections');

const router = express.Router();

JSON_FOLDER_MAPPINGS.forEach(({ collection, label, apiPath }) => {
  router.get(`/${apiPath}/autonomous/:autonomousRollNo`, async (req, res) => {
    try {
      const autonomousRollNo = req.params.autonomousRollNo?.trim();

      if (!autonomousRollNo) {
        return res.status(400).json({ message: 'Autonomous Roll No is required' });
      }

      const doc = await mongoose.connection.db
        .collection(collection)
        .findOne({ 'Autonomous Roll No': autonomousRollNo });

      if (!doc) {
        return res.status(404).json({ message: `${label} record not found` });
      }

      return res.json(doc);
    } catch (error) {
      console.error(`Error fetching ${collection}:`, error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  router.get(`/${apiPath}/roll/:rollNo`, async (req, res) => {
    try {
      const rollNo = req.params.rollNo?.trim();

      if (!rollNo) {
        return res.status(400).json({ message: 'Roll No is required' });
      }

      const doc = await mongoose.connection.db
        .collection(collection)
        .findOne({ 'Roll No': rollNo });

      if (!doc) {
        return res.status(404).json({ message: `${label} record not found` });
      }

      return res.json(doc);
    } catch (error) {
      console.error(`Error fetching ${collection} by roll:`, error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });
});

router.get('/collections', (_req, res) => {
  res.json({
    collections: JSON_FOLDER_MAPPINGS.map((item) => ({
      label: item.label,
      collection: item.collection,
      file: item.file,
      endpoints: {
        byAutonomousRoll: `/api/semester-json/${item.apiPath}/autonomous/:autonomousRollNo`,
        byRollNo: `/api/semester-json/${item.apiPath}/roll/:rollNo`,
      },
    })),
  });
});

module.exports = router;
