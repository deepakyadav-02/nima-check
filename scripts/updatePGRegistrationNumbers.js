/**
 * Set registrationNumber on pgallsemesters by college rollNo.
 * Run: node scripts/updatePGRegistrationNumbers.js
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGAllSemesters = require('../models/PGAllSemesters');

/** Roll No → Registration Number (PG 2024 batch) */
const ROLL_TO_REGISTRATION = {
  'CHEM24-018': '6072/24',
  'CHEM24-003': '6073/24',
  'CHEM24-004': '6074/24',
  'CHEM24-014': '6075/24',
  'CHEM24-022': '6076/24',
  'CHEM24-006': '6077/24',
  'CHEM24-019': '6078/24',
  'CHEM24-021': '6079/24',
  'CHEM24-015': '6080/24',
  'CHEM24-002': '6081/24',
  'CHEM24-013': '6082/24',
  'CHEM24-001': '6083/24',
  'CHEM24-011': '6084/24',
  'CHEM24-012': '6085/24',
  'CHEM24-016': '6086/24',
  'CHEM24-020': '6087/24',
  'COMM24-001': '6089/24',
  'COMM24-002': '6106/24',
  'COMM24-003': '6090/24',
  'COMM24-004': '6095/24',
  'COMM24-005': '6094/24',
  'COMM24-006': '6105/24',
  'COMM24-008': '6104/24',
  'COMM24-009': '6097/24',
  'COMM24-010': '6088/24',
  'COMM24-011': '6091/24',
  'COMM24-012': '6101/24',
  'COMM24-013': '6096/24',
  'COMM24-014': '6102/24',
  'COMM24-015': '6098/24',
  'COMM24-016': '6099/24',
  'COMM24-017': '6100/24',
  'COMM24-019': '6103/24',
  'COMM24-020': '6093/24',
  'COMM24-021': '6092/24',
  'GEOL24-001': '6108/24',
  'GEOL24-002': '6116/24',
  'GEOL24-003': '6113/24',
  'GEOL24-004': '6110/24',
  'GEOL24-005': '6115/24',
  'GEOL24-006': '6107/24',
  'GEOL24-007': '6119/24',
  'GEOL24-009': '6120/24',
  'GEOL24-010': '6109/24',
  'GEOL24-011': '6122/24',
  'GEOL24-012': '6114/24',
  'GEOL24-013': '6121/24',
  'GEOL24-014': '6112/24',
  'GEOL24-015': '6118/24',
  'GEOL24-016': '6117/24',
  'GEOL24-017': '6111/24',
  'MATH24-001': '6126/24',
  'MATH24-002': '6133/24',
  'MATH24-003': '6128/24',
  'MATH24-004': '6137/24',
  'MATH24-005': '6131/24',
  'MATH24-006': '6123/24',
  'MATH24-007': '6129/24',
  'MATH24-008': '6124/24',
  'MATH24-010': '6132/24',
  'MATH24-011': '6127/24',
  'MATH24-012': '6135/24',
  'MATH24-013': '6134/24',
  'MATH24-014': '6125/24',
  'MATH24-015': '6136/24',
  'MATH24-016': '6130/24',
  'MATH24-017': '6138/24',
  'ODIA24-001': '6139/24',
  'ODIA24-002': '6152/24',
  'ODIA24-003': '6162/24',
  'ODIA24-004': '6144/24',
  'ODIA24-005': '6158/24',
  'ODIA24-006': '6161/24',
  'ODIA24-007': '6157/24',
  'ODIA24-009': '6142/24',
  'ODIA24-010': '6150/24',
  'ODIA24-011': '6153/24',
  'ODIA24-013': '6148/24',
  'ODIA24-018': '6154/24',
  'ODIA24-019': '6168/24',
  'ODIA24-022': '6155/24',
  'ODIA24-024': '6163/24',
  'ODIA24-025': '6140/24',
  'ODIA24-026': '6159/24',
  'ODIA24-028': '6164/24',
  'ODIA24-030': '6145/24',
  'ODIA24-031': '6149/24',
  'ODIA24-032': '6141/24',
  'ODIA24-033': '6165/24',
  'ODIA24-034': '6166/24',
  'ODIA24-035': '6160/24',
  'ODIA24-036': '6146/24',
  'ODIA24-037': '6167/24',
  'ODIA24-038': '6147/24',
  'ODIA24-039': '6151/24',
  'ODIA24-040': '6156/24',
  'ODIA24-041': '6143/24',
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected. Updating registration numbers...\n');

  let updated = 0;
  let notFound = 0;

  for (const [rollNo, registrationNumber] of Object.entries(ROLL_TO_REGISTRATION)) {
    const result = await PGAllSemesters.updateOne(
      { rollNo },
      { $set: { registrationNumber } }
    );

    if (result.matchedCount === 0) {
      console.warn(`  Not found: rollNo=${rollNo}`);
      notFound += 1;
    } else {
      console.log(`  ${rollNo} → ${registrationNumber}`);
      updated += 1;
    }
  }

  console.log(`\nDone. Updated: ${updated}, not found: ${notFound}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
