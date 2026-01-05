const fs = require('fs');
const path = require('path');

// Convert date from mm/dd/yy to dd-mm-yyyy
const convertDate = (dateString) => {
  if (!dateString) return null;
  
  // Handle backslash (like "13/05\\2007" -> "13/05/2007")
  let cleanDate = dateString.replace(/\\/g, '/');
  
  // Split by '/'
  const parts = cleanDate.split('/');
  
  if (parts.length !== 3) {
    return dateString; // Return original if can't parse
  }
  
  let month = parseInt(parts[0], 10);
  let day = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  // Check if it's already in dd-mm-yyyy format (month > 12)
  // If month > 12, swap month and day
  if (month > 12) {
    [month, day] = [day, month];
  }
  
  // Validate month
  if (month < 1 || month > 12) {
    return dateString; // Return original if invalid
  }
  
  // Convert 2-digit year to 4-digit year
  // Assuming years 00-30 are 2000-2030, and 31-99 are 1931-1999
  if (year < 100) {
    if (year <= 30) {
      year = 2000 + year;
    } else {
      year = 1900 + year;
    }
  }
  
  // Format as dd-mm-yyyy
  const formattedDay = day.toString().padStart(2, '0');
  const formattedMonth = month.toString().padStart(2, '0');
  const formattedYear = year.toString();
  
  return `${formattedDay}-${formattedMonth}-${formattedYear}`;
};

// Convert dates in JSON file
const convertJSONDates = () => {
  try {
    const jsonFilePath = path.join(__dirname, '../JSONS/first-year/excel-to-json (2).json');
    console.log('📄 Reading file:', jsonFilePath);
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ Error: File not found at ${jsonFilePath}`);
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📊 Found ${jsonData.length} records\n`);

    let converted = 0;
    let errors = 0;

    console.log('🔄 Converting dates from mm/dd/yy to dd-mm-yyyy...\n');

    // Convert dates in each record
    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      const originalDOB = record.DOB;
      
      if (originalDOB) {
        const convertedDOB = convertDate(originalDOB);
        if (convertedDOB !== originalDOB) {
          record.DOB = convertedDOB;
          converted++;
          if (i < 5 || (i + 1) % 50 === 0) {
            console.log(`[${i + 1}/${jsonData.length}] ${originalDOB} -> ${convertedDOB}`);
          }
        } else if (convertedDOB === originalDOB && !originalDOB.includes('-')) {
          // Date format was already correct or couldn't be parsed
          errors++;
          console.log(`[${i + 1}/${jsonData.length}] ⚠️  Could not convert: ${originalDOB}`);
        }
      }
    }

    // Write updated JSON back to file
    const outputPath = jsonFilePath;
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('\n' + '='.repeat(70));
    console.log('📊 DATE CONVERSION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records: ${jsonData.length}`);
    console.log(`✅ Dates Converted: ${converted}`);
    console.log(`⚠️  Errors/Warnings: ${errors}`);
    console.log(`\n✅ File updated: ${outputPath}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the conversion
convertJSONDates();

