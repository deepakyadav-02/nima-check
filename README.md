# Student Management Backend

A Node.js backend API for managing UG, PG, and BBA students with MongoDB integration.

## Features

- **Three Student Models**: UG, PG, and BBA students with separate schemas
- **Authentication**: Login using Autonomous Roll No and Date of Birth
- **Admit Card API**: Get student data for admit card generation
- **Data Import**: Bulk import student data to all models
- **JWT Authentication**: Secure API endpoints
- **MongoDB Integration**: Scalable database solution

## Project Structure

```
├── models/
│   ├── UGStudent.js      # UG Student model
│   ├── PGStudent.js      # PG Student model
│   └── BBAStudent.js     # BBA Student model
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── students.js       # Student data routes
│   └── dataImport.js     # Data import routes
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── config/
│   └── db.js             # Database connection
├── server.js              # Main server file
├── config.env             # Environment variables
└── package.json
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd main-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `config.env` and update the values:
   ```env
   MONGO_URI=mongodb://localhost:27017/student_management
   JWT_SECRET=your_jwt_secret_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Or use MongoDB Atlas (cloud service)

5. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

- **POST** `/api/auth/login` - Student login
  ```json
  {
    "autonomousRollNo": "NACBBA24-001",
    "dob": "01-01-2005"
  }
  ```

### Students

- **GET** `/api/students/admit-card?autonomousRollNo=NACBBA24-001` - Get admit card data
- **GET** `/api/students/profile` - Get authenticated student profile (requires JWT)
- **GET** `/api/students/search?autonomousRollNo=NACBBA24-001` - Search student

### Data Import

- **POST** `/api/data-import/ug-students` - Import UG students data
- **POST** `/api/data-import/pg-students` - Import PG students data
- **POST** `/api/data-import/bba-students` - Import BBA students data
- **POST** `/api/data-import/all-students` - Import all students data at once
- **GET** `/api/data-import/status` - Get import status

### Health Check

- **GET** `/health` - Server health status
- **GET** `/` - API information

## Data Import Example

To import all students data at once:

```bash
POST /api/data-import/all-students
Content-Type: application/json

{
  "ugStudents": [
    {
      "Department": "ECONOMICS",
      "Sl.No": 1,
      "Autonomous Roll No": "03NAC24001",
      "Name of the Students": "BISWARANJAN SAHOO",
      "Major-3": "Economics",
      "Major-4": "Economics",
      "MINOR-2": "ODIA",
      "Multi Disciplinary-2": "F.L",
      "AEC-2": "ENGLISH",
      "SEC-I": "Q.L.T",
      "Roll No": "BA24-003",
      "dob": "01-01-2005"
    }
  ],
  "pgStudents": [
    {
      "Barcode No.": "24P1005582",
      "College Roll No": "ODIA24-001",
      "Autonomous Roll No": "111NAC24001",
      "Applicant Name": "BARSA NAYAK",
      "DOB": "15-07-2002",
      "Course": "Odia",
      "Graduation Board": "Utkal University"
    }
  ],
  "bbaStudents": [
    {
      "Department": "BBA ",
      "Sl.No": 1,
      "Roll No": "BBA-24-001",
      "Autonomous Roll No": "NACBBA24-001",
      "Name of the Students": "Anil Parida",
      "CC-201": "H.B & O",
      "CC-202": "M.M",
      "CC-203": "B.E",
      "Multi Disciplinary-201": "M.L & C.T",
      "AEC-201": "B.C",
      "SEC-201": "E.T & A",
      "VAC-201-I.C": "ES & S",
      "dob": "01-01-2005"
    }
  ]
}
```

## Frontend Integration

### Login Flow
1. User enters Autonomous Roll No and DOB
2. Frontend calls `/api/auth/login`
3. Backend returns JWT token
4. Frontend stores token and uses it for authenticated requests

### Admit Card Download
1. Frontend calls `/api/students/admit-card?autonomousRollNo=XXX`
2. Backend returns student data
3. Frontend generates and downloads admit card

## Security Features

- JWT token-based authentication
- Password hashing (if needed in future)
- Input validation using express-validator
- CORS enabled for frontend integration
- Environment variable configuration

## Error Handling

The API includes comprehensive error handling:
- Validation errors
- Database connection errors
- Authentication errors
- General server errors

## Development

- **Hot reload**: Use `npm run dev` for development
- **Logging**: Console logging for debugging
- **Environment**: Separate config for development/production

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure MongoDB Atlas or production MongoDB
4. Set up proper CORS origins
5. Use environment variables for sensitive data

## Workflow Report

### Performance Optimization Tasks

- Optimize backend API route to use parallel queries instead of sequential
- Add database indexes for frequently queried fields
- Implement response caching on backend
- Add frontend caching to avoid redundant API calls

### PG Marksheet JSON Structure Changes

The `pgMark_sheet.json` file was restructured to improve data clarity and consistency:

#### Key Changes Made:

1. **Full Subject Names Instead of Subject Codes**
   - **Before:** Used short subject codes (e.g., "SUB101", "SUB102")
   - **After:** Uses complete descriptive subject names (e.g., "PURANA O PRACHINA KABYA KABITA", "ADHUNIKA KABYA KABITA-I")
   - **Benefit:** More readable and self-explanatory, eliminates need for code-to-name mapping

2. **Course Type Instead of Subject Code**
   - **Before:** Used `subjectCode` field
   - **After:** Uses `courseType` field with descriptive identifiers
   - **Format:** 
     - For Odia department: `PAPER1.1`, `PAPER1.2`, `PAPER1.3`, `PAPER1.4`
     - For other departments: Course codes like `MTC101`, `CHEM201`, etc.
   - **Benefit:** Clearer identification of course types and better organization

3. **PG-Specific Mark Fields**
   - **Replaced:** UG format fields (`theory`, `internal`)
   - **With:** PG format fields (`midsem`, `endsem`)
   - **Additional:** Includes `practical` field when applicable
   - **Benefit:** Accurate representation of PG examination structure

4. **Pre-Calculated Summary Values**
   - Includes calculated fields at marksheet level:
     - `totalCredits`: Sum of all course credits
     - `totalCreditPoints`: Sum of all credit points
     - `sgpa`: Semester Grade Point Average
     - `percentage`: Overall percentage
     - `classification`: Result classification (e.g., "Very Good", "Good", "Pass")
   - **Benefit:** Reduces computation time and ensures consistency

5. **Department Information**
   - Added `department` field at marksheet level (e.g., "ODIA", "CHEMISTRY", "MATHEMATICS")
   - Added `stream` field for categorization (e.g., "ARTS", "SCIENCE")
   - **Benefit:** Easy filtering and organization by department

#### Example Structure:

```json
{
  "CollegeRollNo": "ODIA24-001",
  "AutonomousRollNo": "111NAC24001",
  "Name": "BARSA NAYAK",
  "semester": 1,
  "courses": [
    {
      "subjectName": "PURANA O PRACHINA KABYA KABITA",
      "courseType": "PAPER1.1",
      "credit": 4,
      "midsem": 23,
      "endsem": 50,
      "marks": 73,
      "grade": "A",
      "gradePoint": 8,
      "creditPoint": 32,
      "percentage": 73
    }
  ],
  "totalCredits": 16,
  "totalCreditPoints": 128,
  "sgpa": 8,
  "percentage": 75,
  "classification": "Very Good",
  "department": "ODIA",
  "stream": "ARTS"
}
```

#### Benefits of These Changes:

- ✅ **Better Readability:** Full subject names are self-explanatory
- ✅ **No Code Mapping:** Eliminates need for subject code lookup tables
- ✅ **Accurate Representation:** PG-specific fields match actual examination structure
- ✅ **Performance:** Pre-calculated values reduce computation overhead
- ✅ **Consistency:** Standardized structure across all PG departments

## Support

For any issues or questions, please check the API documentation or contact the development team.

