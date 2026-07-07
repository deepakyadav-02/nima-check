require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

const inferBatch = (doc) => {
  if (doc.batch) return String(doc.batch).trim();

  const roll = String(
    doc['Autonomous Roll No'] || doc['Roll No'] || doc['College Roll No'] || ''
  ).trim();

  // 81NAC24001, 111NAC24001
  const nacMatch = roll.match(/NAC(\d{2})/i);
  if (nacMatch) return `20${nacMatch[1]}`;

  // NACBBA24-001
  const bbaMatch = roll.match(/BBA(\d{2})/i);
  if (bbaMatch) return `20${bbaMatch[1]}`;

  // BC24-001, BA24-001, BS24-001, Bca-24-001
  const collegeMatch = roll.match(/[A-Za-z]+-?(\d{2})-/);
  if (collegeMatch) return `20${collegeMatch[1]}`;

  return 'unknown';
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = [
    { coll: 'ugstudents', type: 'UG' },
    { coll: 'pgstudents', type: 'PG' },
    { coll: 'bbastudents', type: 'BBA' },
    { coll: 'ugfirstsem2025', type: 'UG2025' },
    { coll: 'pgfirstsem2025', type: 'PG2025' },
  ];

  console.log('=== STUDENTS BY BATCH (all collections) ===\n');

  const grand = {};

  for (const { coll, type } of collections) {
    const count = await db.collection(coll).countDocuments();
    if (!count) {
      console.log(`${type} (${coll}): 0 students`);
      continue;
    }

    const docs = await db
      .collection(coll)
      .find({})
      .project({
        ABC_ID: 1,
        batch: 1,
        'Roll No': 1,
        'Autonomous Roll No': 1,
        Department: 1,
        Course: 1,
      })
      .toArray();

    const byBatch = {};
    docs.forEach((d) => {
      const batch = inferBatch(d);
      if (!byBatch[batch]) byBatch[batch] = { total: 0, withAbc: 0 };
      byBatch[batch].total += 1;
      const abc = d.ABC_ID;
      if (abc !== null && abc !== undefined && String(abc).trim() !== '') {
        byBatch[batch].withAbc += 1;
      }
      if (!grand[batch]) grand[batch] = { total: 0, withAbc: 0 };
      grand[batch].total += 1;
      if (abc !== null && abc !== undefined && String(abc).trim() !== '') {
        grand[batch].withAbc += 1;
      }
    });

    console.log(`${type} (${coll}): ${count} students`);
    Object.keys(byBatch)
      .sort()
      .forEach((b) => {
        const x = byBatch[b];
        console.log(
          `  Batch ${b}: ${x.total} total, ${x.withAbc} with ABC ID, ${x.total - x.withAbc} without`
        );
      });
    console.log('');
  }

  const subCount = await db.collection('abcidsubmissions').countDocuments();
  console.log(`Portal ABC submissions (abcidsubmissions): ${subCount}`);

  if (subCount > 0) {
    const subs = await db.collection('abcidsubmissions').find({}).toArray();
    const subByBatch = {};
    subs.forEach((s) => {
      const b = inferBatch(s);
      subByBatch[b] = (subByBatch[b] || 0) + 1;
    });
    Object.entries(subByBatch)
      .sort()
      .forEach(([b, c]) => console.log(`  Batch ${b}: ${c} submissions`));
  }

  console.log('\n=== GRAND TOTAL BY BATCH ===');
  Object.keys(grand)
    .sort()
    .forEach((b) => {
      const x = grand[b];
      const pct = x.total ? ((x.withAbc / x.total) * 100).toFixed(1) : '0.0';
      console.log(
        `Batch ${b}: ${x.withAbc} / ${x.total} students have ABC ID (${pct}%)`
      );
    });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
