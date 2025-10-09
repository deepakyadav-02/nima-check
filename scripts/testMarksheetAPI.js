const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001/api';

// Sample data
const sampleMarksheets = {
  createdBy: "admin@test.com",
  marksheets: [
    {
      autonomousRollNo: "UG2024001",
      semester: 1,
      courses: [
        { subjectName: "Physics", courseType: "Major-cp-1", credit: 4, marks: 85 },
        { subjectName: "Chemistry", courseType: "Major-cp-1", credit: 4, marks: 78 },
        { subjectName: "Mathematics", courseType: "Major-cp-2", credit: 4, marks: 92 },
        { subjectName: "English", courseType: "AEC", credit: 2, marks: 75 },
        { subjectName: "Environmental Science", courseType: "SEC", credit: 2, marks: 88 }
      ]
    }
  ]
};

// Test functions
async function adminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/admin-login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Admin login successful');
    console.log('Token:', response.data.token.substring(0, 50) + '...');
    return response.data.token;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function bulkUploadMarks(token) {
  console.log('\n📤 Testing Bulk Upload Marks...');
  try {
    const response = await axios.post(
      `${BASE_URL}/marksheet/bulk-upload`,
      sampleMarksheets,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Bulk upload successful');
    console.log('Summary:', response.data.summary);
    console.log('Success count:', response.data.results.success.length);
    console.log('Failed count:', response.data.results.failed.length);
    
    if (response.data.results.success.length > 0) {
      console.log('\nFirst successful upload:');
      console.log(JSON.stringify(response.data.results.success[0], null, 2));
      return response.data.results.success[0].marksheetId;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Bulk upload failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getMarksheetByAutonomousRollNo(rollNo) {
  console.log(`\n📋 Testing Get Marksheet by Autonomous Roll No (${rollNo})...`);
  try {
    const response = await axios.get(`${BASE_URL}/marksheet/autonomous/${rollNo}`);
    
    console.log('✅ Marksheet retrieved successfully');
    console.log(`Found ${response.data.length} marksheet(s)`);
    
    if (response.data.length > 0) {
      const marksheet = response.data[0];
      console.log('\nMarksheet Details:');
      console.log('- Semester:', marksheet.semester);
      console.log('- Total Credits:', marksheet.totalCredits);
      console.log('- SGPA:', marksheet.sgpa);
      console.log('- Percentage:', marksheet.percentage);
      console.log('- Classification:', marksheet.classification);
      console.log('- Courses:', marksheet.courses.length);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Get marksheet failed:', error.response?.data || error.message);
  }
}

async function getMarksheetById(marksheetId) {
  console.log(`\n📄 Testing Get Marksheet by ID...`);
  try {
    const response = await axios.get(`${BASE_URL}/marksheet/${marksheetId}`);
    
    console.log('✅ Marksheet retrieved successfully');
    console.log('Marksheet ID:', response.data._id);
    console.log('Student:', response.data.student['Name of the Students']);
    console.log('SGPA:', response.data.sgpa);
    
    return response.data;
  } catch (error) {
    console.error('❌ Get marksheet by ID failed:', error.response?.data || error.message);
  }
}

async function deleteMarksheet(token, marksheetId) {
  console.log(`\n🗑️  Testing Delete Marksheet...`);
  try {
    const response = await axios.delete(`${BASE_URL}/marksheet/${marksheetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Marksheet deleted successfully');
    console.log('Message:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Delete marksheet failed:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Marksheet API Tests...');
  console.log('Base URL:', BASE_URL);
  
  try {
    // 1. Admin login
    const token = await adminLogin();
    
    // 2. Bulk upload marks
    const marksheetId = await bulkUploadMarks(token);
    
    // 3. Get marksheet by autonomous roll no
    if (sampleMarksheets.marksheets[0].autonomousRollNo) {
      await getMarksheetByAutonomousRollNo(sampleMarksheets.marksheets[0].autonomousRollNo);
    }
    
    // 4. Get marksheet by ID
    if (marksheetId) {
      await getMarksheetById(marksheetId);
    }
    
    // 5. Delete marksheet (optional - uncomment to test)
    // if (marksheetId) {
    //   await deleteMarksheet(token, marksheetId);
    // }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { adminLogin, bulkUploadMarks, getMarksheetByAutonomousRollNo };

