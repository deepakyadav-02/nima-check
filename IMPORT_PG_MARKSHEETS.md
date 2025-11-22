# How to Import PG Marksheets

## Overview
PG marksheets can be imported into the same `UGMarksheet` collection (which supports UG, PG, and BBA students). The system automatically detects PG students and stores their marksheets correctly.

## Step 1: Ensure PG Students are in Database
Make sure all PG students from `pgMark_sheet.json` exist in the `PGStudent` collection with their `Autonomous Roll No` matching the `AutonomousRollNo` in the marksheet file.

## Step 2: Import PG Marksheets

Run the import script:

```bash
cd nima-check
node scripts/importMarksheets.js --file JSONS/pgMark_sheet.json --base-url http://localhost:5000/api
```

**Options:**
- `--file`: Path to the PG marksheet JSON file (default: `test1.json`)
- `--base-url`: Backend API URL (default: `http://localhost:5001/api`)
- `--chunk`: Number of marksheets per batch (default: 25)
- `--admin-user`: Admin username (default: `admin`)
- `--admin-pass`: Admin password (default: `admin123`)
- `--skip-clear`: Skip clearing existing marksheets

**Example with custom options:**
```bash
node scripts/importMarksheets.js \
  --file JSONS/pgMark_sheet.json \
  --base-url http://localhost:5000/api \
  --chunk 50 \
  --admin-user admin \
  --admin-pass admin123
```

## Step 3: Verify Import

After import, PG students can:
1. Login with their Autonomous Roll No and DOB
2. Navigate to "Grade Sheet" from the dashboard
3. View their marksheets with PG course types (PAPER1.1, PAPER1.2, etc.)
4. Download marksheets as PDF

## API Endpoint

PG marksheets are fetched using the same endpoint as UG marksheets:
```
GET /api/marksheet/autonomous/:autonomousRollNo
```

The API automatically detects if the student is UG, PG, or BBA and returns the appropriate marksheets.

## Data Format

The `pgMark_sheet.json` file uses:
- `AutonomousRollNo` (camelCase) - maps to `Autonomous Roll No` in database
- `CollegeRollNo` - maps to `College Roll No` in database
- `courseType`: PAPER1.1, PAPER1.2, etc. (preserved as-is)
- `midsem` and `endsem` fields (PG-specific)
- All other fields (marks, grade, gradePoint, etc.) are standard

## Troubleshooting

1. **Student not found errors**: Ensure PG students exist in the database with matching `Autonomous Roll No`
2. **Course type errors**: The system now accepts any course type starting with "PAPER"
3. **Empty grade sheet**: Check that marksheets were imported successfully and the student's roll number matches









