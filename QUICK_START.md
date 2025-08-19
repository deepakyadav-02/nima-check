# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## 1. Setup MongoDB

### Option A: Local MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Update `config.env` with your Atlas URI

## 2. Update Configuration
Edit `config.env`:
```env
MONGO_URI=mongodb://localhost:27017/student_management
JWT_SECRET=your_super_secret_key_here
PORT=5001
NODE_ENV=development
```

## 3. Start the Server
```bash
# Option 1: Use startup script
./start.sh

# Option 2: Manual start
npm run dev
```

## 4. Test the API
```bash
# Health check
curl http://localhost:5001/health

# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"autonomousRollNo":"NACBBA24-001","dob":"01-01-2005"}'
```

## 5. Import Your Data
```bash
# Run the import script
node scripts/importData.js

# Use the generated importData.json to import all data
curl -X POST http://localhost:5001/api/data-import/all-students \
  -H "Content-Type: application/json" \
  -d @importData.json
```

## 6. Test All Endpoints
```bash
# Test the complete API
node scripts/testAPI.js
```

## 🎯 Key Features Ready to Use

✅ **Authentication**: Login with Autonomous Roll No + DOB  
✅ **Admit Card**: Get student data for admit card generation  
✅ **Data Import**: Bulk import all your JSON data  
✅ **Three Models**: UG, PG, and BBA students  
✅ **JWT Security**: Protected API endpoints  
✅ **MongoDB**: Scalable database storage  

## 🔗 API Endpoints

- `POST /api/auth/login` - Student login
- `GET /api/students/admit-card?autonomousRollNo=XXX` - Get admit card data
- `POST /api/data-import/all-students` - Import all data
- `GET /api/data-import/status` - Check import status

## 🆘 Troubleshooting

**Server won't start?**
- Check MongoDB is running
- Verify `config.env` has correct MONGO_URI
- Check port 5000 is available

**Import failed?**
- Ensure JSON files are valid
- Check MongoDB connection
- Verify model schemas match your data

**Need help?**
- Check the full README.md
- Review error logs in console
- Verify all dependencies installed

## 🎉 You're Ready!

Your backend is now running with:
- ✅ 3 Student Models (UG, PG, BBA)
- ✅ Authentication System
- ✅ Admit Card API
- ✅ Data Import System
- ✅ MongoDB Integration

Frontend can now integrate using the documented API endpoints!
