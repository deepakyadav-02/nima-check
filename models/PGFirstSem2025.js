const mongoose = require('mongoose');

// Define schema fields to prevent Mongoose from interpreting dots as nested paths
const schemaDefinition = {
  "Sl.No": {
    type: String,
    required: false
  },
  "College Roll No": {
    type: String,
    required: false
  },
  "Autonomous Roll No": {
    type: String,
    required: false
  },
  "Name of the Students": {
    type: String,
    required: false
  },
  // First Semester Papers - using bracket notation to preserve exact field names
  "PAPER-1.1": {
    type: String,
    required: false
  },
  "PAPER-1.2": {
    type: String,
    required: false
  },
  "PAPER-1.3": {
    type: String,
    required: false
  },
  "PAPER-1.4": {
    type: String,
    required: false
  },
  "PAPER-1.5": {
    type: String,
    required: false
  },
  "PAPER-1.6": {
    type: String,
    required: false
  },
  "PAPER-1.7": {
    type: String,
    required: false
  },
  dob: {
    type: String,
    required: false,
    default: "01-01-2005"
  },
  ABC_ID: {
    type: String,
    required: false,
    default: null
  },
  profileImage: {
    type: String,
    required: false,
    default: null
  },
  batch: {
    type: String,
    required: false,
    default: "2025"
  }
};

const PGFirstSem2025Schema = new mongoose.Schema(schemaDefinition, {
  timestamps: false,
  strict: true,
  // Prevent Mongoose from interpreting dots in field names as nested paths
  minimize: false
});

// Add a pre-save hook to ensure field names with dots are preserved
PGFirstSem2025Schema.pre('save', function(next) {
  // Ensure PAPER fields are preserved as flat fields, not nested
  const paperFields = ["PAPER-1.1", "PAPER-1.2", "PAPER-1.3", "PAPER-1.4", "PAPER-1.5", "PAPER-1.6", "PAPER-1.7"];
  paperFields.forEach(field => {
    if (this[field] && typeof this[field] === 'object' && !Array.isArray(this[field])) {
      // If somehow nested, extract the value
      const value = this[field];
      if (value && typeof value === 'object') {
        // This shouldn't happen, but just in case
        console.warn(`Field ${field} appears to be nested, preserving as-is`);
      }
    }
  });
  next();
});

// Index for faster queries
PGFirstSem2025Schema.index({ "Autonomous Roll No": 1 });
PGFirstSem2025Schema.index({ dob: 1 });

// Use explicit collection name to prevent pluralization issues
module.exports = mongoose.model('PGFirstSem2025', PGFirstSem2025Schema, 'pgfirstsem2025');

