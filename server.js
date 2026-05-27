const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
// Support both .env and config.env (do not overwrite already-set vars)
dotenv.config({ path: './.env', override: false });
dotenv.config({ path: './config.env', override: false });

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/data-import', require('./routes/dataImport'));
app.use('/api/marksheet', require('./routes/marksheet'));
app.use('/api/abc-id', require('./routes/abcId'));
app.use('/api/ug-2ndsem2024', require('./routes/ugSecondSem2024'));
app.use('/api/pg-2ndsem2024', require('./routes/pgSecondSem2024'));
app.use('/api/pg-sem3', require('./routes/pgSem3'));
app.use('/api/pg-sem4', require('./routes/pgSem4'));
app.use('/api/pg/all-semesters', require('./routes/pgAllSemesters'));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Student Management Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Student Management Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      dataImport: '/api/data-import',
      marksheet: '/api/marksheet',
      abcId: '/api/abc-id',
      ug2ndsem2024: '/api/ug-2ndsem2024',
      pg2ndsem2024: '/api/pg-2ndsem2024',
      pgSem3: '/api/pg-sem3',
      pgSem4: '/api/pg-sem4',
      pgAllSemesters: '/api/pg/all-semesters'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: [
      'POST /api/students/upload-image',
      'DELETE /api/students/delete-image',
      'GET /api/students/profile',
      'GET /api/students/admit-card'
    ]
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${process.env.MONGO_URI}`);
});

