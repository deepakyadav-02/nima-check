# Routes and Models Documentation

This document provides a comprehensive overview of all API routes and which models (MongoDB collections) each route uses.

## Available Models

1. **UGStudent** - Undergraduate student data
2. **PGStudent** - Postgraduate student data
3. **BBAStudent** - BBA student data
4. **UGMarksheet** - Marksheet data for all student types (despite the name)
5. **ABCIDSubmission** - ABC ID submission records

---

## Authentication Routes (`/api/auth`)

### POST `/api/auth/login`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Searches all three student models to authenticate a student using Autonomous Roll No and DOB. Returns JWT token.
- **Model Usage**: Queries all three models in parallel and selects based on priority (BBA > PG > UG)

### POST `/api/auth/admin-login`
- **Access**: Public
- **Models Used**: None (uses environment variables for credentials)
- **Description**: Authenticates admin user and returns JWT token.

---

## Student Routes (`/api/students`)

### GET `/api/students/admit-card`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Gets student data for admit card generation. Searches all three models.
- **Query Params**: `autonomousRollNo` (required)
- **Model Usage**: Queries all three models in parallel, priority: BBA > PG > UG

### GET `/api/students/profile`
- **Access**: Private (requires JWT auth)
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Gets authenticated student's profile data.
- **Model Usage**: Uses `studentType` from JWT token to query the appropriate model. Falls back to searching all three if type is missing.

### GET `/api/students/search`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Searches students by Autonomous Roll No.
- **Query Params**: `autonomousRollNo` (required)
- **Model Usage**: Queries all three models in parallel, priority: BBA > PG > UG

### POST `/api/students/bulk-update-dob`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Bulk updates Date of Birth for students using College Roll No.
- **Model Usage**: Updates all three models (tries to update in all, doesn't fail if not found in one)

### POST `/api/students/upload-image`
- **Access**: Private (requires JWT auth)
- **Models Used**: 
  - `UGStudent` (if studentType is 'UG')
  - `PGStudent` (if studentType is 'PG')
  - `BBAStudent` (if studentType is 'BBA')
- **Description**: Uploads/updates student profile image (base64 encoded).
- **Model Usage**: Uses `studentType` from JWT token to determine which model to update. Falls back to searching all three if type is missing.

### DELETE `/api/students/delete-image`
- **Access**: Private (requires JWT auth)
- **Models Used**: 
  - `UGStudent` (if studentType is 'UG')
  - `PGStudent` (if studentType is 'PG')
  - `BBAStudent` (if studentType is 'BBA')
- **Description**: Deletes student profile image.
- **Model Usage**: Uses `studentType` from JWT token to determine which model to update. Falls back to searching all three if type is missing.

### GET `/api/students/test-upload-route`
- **Access**: Public
- **Models Used**: None
- **Description**: Test route to verify upload-image route exists.

---

## Data Import Routes (`/api/data-import`)

### POST `/api/data-import/ug-students`
- **Access**: Public
- **Models Used**: 
  - `UGStudent` only
- **Description**: Imports UG students data. Clears existing data and inserts new records.

### POST `/api/data-import/pg-students`
- **Access**: Public
- **Models Used**: 
  - `PGStudent` only
- **Description**: Imports PG students data. Clears existing data and inserts new records.

### POST `/api/data-import/bba-students`
- **Access**: Public
- **Models Used**: 
  - `BBAStudent` only
- **Description**: Imports BBA students data. Clears existing data and inserts new records.

### POST `/api/data-import/all-students`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Imports all student types at once. Clears and inserts data for each model.

### GET `/api/data-import/status`
- **Access**: Public
- **Models Used**: 
  - `UGStudent`
  - `PGStudent`
  - `BBAStudent`
- **Description**: Returns count of students in each model.

---

## Marksheet Routes (`/api/marksheet`)

### POST `/api/marksheet/bulk-upload`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `UGStudent` (to find student)
  - `PGStudent` (to find student)
  - `BBAStudent` (to find student)
  - `UGMarksheet` (to create/update marksheets)
- **Description**: Bulk uploads marksheets for multiple students. Searches all three student models to find the student, then creates/updates marksheet.
- **Model Usage**: Searches all three student models to find student, then uses UGMarksheet model (which stores marks for all student types)

### GET `/api/marksheet/student/:studentId`
- **Access**: Public
- **Models Used**: 
  - `UGMarksheet` (with populate to student)
- **Description**: Gets all marksheets for a student by student ID.

### GET `/api/marksheet/autonomous/:autonomousRollNo`
- **Access**: Public
- **Models Used**: 
  - `UGStudent` (to find student)
  - `PGStudent` (to find student)
  - `BBAStudent` (to find student)
  - `UGMarksheet` (to get marksheets)
- **Description**: Gets all marksheets by Autonomous Roll No. Searches all three student models first.
- **Model Usage**: Searches all three student models, then queries UGMarksheet with the found student IDs

### GET `/api/marksheet/:id`
- **Access**: Public
- **Models Used**: 
  - `UGMarksheet` (with populate to student)
- **Description**: Gets a single marksheet by ID.

### DELETE `/api/marksheet/:id`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `UGMarksheet` only
- **Description**: Deletes a marksheet by ID.

### DELETE `/api/marksheet/all/clear`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `UGMarksheet` only
- **Description**: Deletes all marksheets.

---

## ABC ID Routes (`/api/abc-id`)

### POST `/api/abc-id/submit`
- **Access**: Private (Student auth required)
- **Models Used**: 
  - `UGStudent` (if studentType is 'UG')
  - `PGStudent` (if studentType is 'PG')
  - `BBAStudent` (if studentType is 'BBA')
  - `ABCIDSubmission`
- **Description**: Submits or updates ABC ID for a student. Updates student record and creates/updates submission record.
- **Model Usage**: Uses `studentType` from JWT token to determine which student model to update

### GET `/api/abc-id/my-submission`
- **Access**: Private (Student auth required)
- **Models Used**: 
  - `UGStudent` (if studentType is 'UG')
  - `PGStudent` (if studentType is 'PG')
  - `BBAStudent` (if studentType is 'BBA')
  - `ABCIDSubmission`
- **Description**: Gets current student's ABC ID submission.
- **Model Usage**: Uses `studentType` from JWT token to query appropriate student model

### GET `/api/abc-id/submissions`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `ABCIDSubmission` only
- **Description**: Gets all ABC ID submissions with optional filtering (status, department, search).

### GET `/api/abc-id/submission/:autonomousRollNo`
- **Access**: Public
- **Models Used**: 
  - `ABCIDSubmission` only
- **Description**: Gets ABC ID submission by Autonomous Roll No.

### PATCH `/api/abc-id/verify/:id`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `ABCIDSubmission` only
- **Description**: Verifies or rejects an ABC ID submission (status: 'verified' or 'rejected').

### DELETE `/api/abc-id/submission/:id`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `ABCIDSubmission`
  - `UGStudent` / `PGStudent` / `BBAStudent` (dynamically based on submission.studentType)
- **Description**: Deletes ABC ID submission and removes ABC_ID from student record.
- **Model Usage**: Uses mongoose.model() to get the appropriate student model based on submission.studentType

### GET `/api/abc-id/stats`
- **Access**: Private (Admin only)
- **Models Used**: 
  - `ABCIDSubmission` only
- **Description**: Gets ABC ID submission statistics (total, by status, by department).

---

## Model Usage Summary

### Models by Usage Frequency

1. **UGStudent, PGStudent, BBAStudent** - Used together in most routes (authentication, search, data import, marksheet, ABC ID)
2. **UGMarksheet** - Used for all marksheet operations (despite the name, stores marks for all student types)
3. **ABCIDSubmission** - Used for ABC ID submission management

### Routes That Search All Three Student Models

Many routes search all three student models (`UGStudent`, `PGStudent`, `BBAStudent`) in parallel using `Promise.all()` and then select based on priority:

- **Priority Order**: BBA > PG > UG

Routes that use this pattern:
- `POST /api/auth/login`
- `GET /api/students/admit-card`
- `GET /api/students/profile` (with fallback)
- `GET /api/students/search`
- `GET /api/marksheet/autonomous/:autonomousRollNo`
- `POST /api/marksheet/bulk-upload`

### Routes That Use Single Model Based on studentType

Some routes use the `studentType` from JWT token to determine which model to use:

- `GET /api/students/profile`
- `POST /api/students/upload-image`
- `DELETE /api/students/delete-image`
- `POST /api/abc-id/submit`
- `GET /api/abc-id/my-submission`

---

## Notes

1. **UGMarksheet Model**: Despite the name, the `UGMarksheet` model is used to store marksheets for ALL student types (UG, PG, and BBA). The `studentType` field in the marksheet document indicates which type of student it belongs to.

2. **Student Model Selection**: Routes that need to find a student by Autonomous Roll No typically search all three models because:
   - Students can belong to any of the three collections
   - The Autonomous Roll No alone doesn't indicate the student type
   - Priority is given to BBA, then PG, then UG

3. **JWT Token**: Student routes that require authentication get `studentType` from the JWT token payload, which allows them to directly query the correct model without searching all three.

