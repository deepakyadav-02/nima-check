require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const ugSample = await db.collection('ugstudents').find({}).limit(5).toArray();
  console.log(
    'UG sample keys:',
    ugSample[0]
      ? Object.keys(ugSample[0]).filter(
          (k) =>
            k.toLowerCase().includes('abc') ||
            k.toLowerCase().includes('batch') ||
            k.includes('Roll')
        )
      : []
  );
  ugSample.forEach((s) =>
    console.log(
      JSON.stringify({
        roll: s['Roll No'],
        auto: s['Autonomous Roll No'],
        batch: s.batch,
        ABC_ID: s.ABC_ID,
      })
    )
  );

  const allUg = await db
    .collection('ugstudents')
    .find({})
    .project({ 'Roll No': 1, 'Autonomous Roll No': 1, batch: 1, ABC_ID: 1 })
    .toArray();

  const yearFromRoll = {};
  allUg.forEach((s) => {
    const roll = String(s['Roll No'] || s['Autonomous Roll No'] || '');
    const m1 = roll.match(/(?:BA|BSC|BCOM|BBA)?-?(\d{2})-/i);
    const m2 = roll.match(/(\d{2})NAC/i);
    const year = m1 ? `20${m1[1]}` : m2 ? `20${m2[1]}` : 'unknown';
    yearFromRoll[year] = (yearFromRoll[year] || 0) + 1;
  });
  console.log('\nUG inferred admission years:', yearFromRoll);

  const abcFields = ['ABC_ID', 'abc_id', 'ABC ID', 'abcId'];
  const orQuery = abcFields.map((f) => ({ [f]: { $exists: true, $nin: [null, ''] } }));

  for (const coll of [
    'ugstudents',
    'pgstudents',
    'bbastudents',
    'ugfirstsem2025',
    'pgfirstsem2025',
    'abcidsubmissions',
  ]) {
    const count = await db.collection(coll).countDocuments();
    if (!count) {
      console.log(`${coll}: empty`);
      continue;
    }
    const withAbcCount = await db.collection(coll).countDocuments({ $or: orQuery });
    console.log(`${coll}: total=${count}, with ABC field=${withAbcCount}`);
  }

  const pgSample = await db.collection('pgstudents').find({}).limit(5).toArray();
  console.log('\nPG roll samples:');
  pgSample.forEach((s) =>
    console.log(
      JSON.stringify({
        roll: s['Roll No'],
        auto: s['Autonomous Roll No'],
        Course: s.Course,
        ABC_ID: s.ABC_ID,
      })
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
