const fs = require('fs');
const path = require('path');

// Read JSON files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
};

// Import data function
const importData = async () => {
  try {
    // Read all JSON files
    const ugStudents = readJsonFile(path.join(__dirname, '../JSONS/final.json'));
    const pgStudents = readJsonFile(path.join(__dirname, '../JSONS/transformed_admissions.json'));
    const bbaStudents = readJsonFile(path.join(__dirname, '../JSONS/bba_department.json'));

    if (!ugStudents || !pgStudents || !bbaStudents) {
      console.error('Failed to read one or more JSON files');
      return;
    }

    console.log('JSON files read successfully:');
    console.log(`- UG Students: ${ugStudents.length}`);
    console.log(`- PG Students: ${pgStudents.length}`);
    console.log(`- BBA Students: ${bbaStudents.length}`);

    // Prepare data for API call
    const importData = {
      ugStudents,
      pgStudents,
      bbaStudents
    };

    // Save to a file that can be used with the API
    const outputPath = path.join(__dirname, '../importData.json');
    fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2));
    
    console.log(`\nImport data saved to: ${outputPath}`);
    console.log('\nTo import this data, use the API endpoint:');
    console.log('POST /api/data-import/all-students');
    console.log(`\nOr use curl command:`);
    console.log(`curl -X POST http://localhost:5001/api/data-import/all-students \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d @${outputPath}`);

  } catch (error) {
    console.error('Error in import script:', error.message);
  }
};

// Run the import script
importData();
