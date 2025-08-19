const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testStudent = {
  autonomousRollNo: 'NACBBA24-001',
  dob: '01-01-2005'
};

const testAPI = async () => {
  try {
    console.log('🧪 Testing Student Management API...\n');

    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);

    // Test 2: Login
    console.log('\n2. Testing student login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testStudent);
    console.log('✅ Login successful:', loginResponse.data.message);
    const token = loginResponse.data.token;

    // Test 3: Get admit card data
    console.log('\n3. Testing admit card API...');
    const admitCardResponse = await axios.get(`${BASE_URL}/students/admit-card`, {
      params: { autonomousRollNo: testStudent.autonomousRollNo }
    });
    console.log('✅ Admit card data retrieved:', admitCardResponse.data.studentType);

    // Test 4: Get authenticated profile
    console.log('\n4. Testing authenticated profile...');
    const profileResponse = await axios.get(`${BASE_URL}/students/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieved successfully');

    // Test 5: Search student
    console.log('\n5. Testing student search...');
    const searchResponse = await axios.get(`${BASE_URL}/students/search`, {
      params: { autonomousRollNo: testStudent.autonomousRollNo }
    });
    console.log('✅ Student search successful:', searchResponse.data.studentType);

    // Test 6: Get import status
    console.log('\n6. Testing import status...');
    const statusResponse = await axios.get(`${BASE_URL}/data-import/status`);
    console.log('✅ Import status retrieved:', statusResponse.data);

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📊 Current database status:');
    console.log(`- UG Students: ${statusResponse.data.ugStudents}`);
    console.log(`- PG Students: ${statusResponse.data.pgStudents}`);
    console.log(`- BBA Students: ${statusResponse.data.bbaStudents}`);
    console.log(`- Total: ${statusResponse.data.totalStudents}`);

  } catch (error) {
    console.error('\n❌ API test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the server is running on port 5000');
      console.log('💡 Run: npm run dev');
    }
    
    if (error.response?.status === 500) {
      console.log('\n💡 Make sure MongoDB is running and connected');
      console.log('💡 Check your config.env file');
    }
  }
};

// Run tests
testAPI();
