const mongoose = require('mongoose');

// strict: false so all department-specific subject fields (CH-408, PAPER-2.x, MTC-2xx, etc.) are stored as-is
const pgSecondSem2025Schema = new mongoose.Schema(
  {},
  {
    timestamps: false,
    strict: false,
  }
);

pgSecondSem2025Schema.index({ 'Autonomous Roll No': 1 });
pgSecondSem2025Schema.index({ 'College Roll No': 1 });
pgSecondSem2025Schema.index({ Department: 1 });

module.exports = mongoose.model('PGSecondSem2025', pgSecondSem2025Schema, 'pg2025-2ndsem');
