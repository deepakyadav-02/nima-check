// Quick test script to verify routes are loaded
const studentsRouter = require('./routes/students');

console.log('Testing routes...');
console.log('Router loaded:', !!studentsRouter);

// Check if router has the upload-image route
const stack = studentsRouter.stack || [];
const uploadRoute = stack.find(layer => 
  layer.route && layer.route.path === '/upload-image'
);

if (uploadRoute) {
  console.log('✅ Upload route found:', uploadRoute.route.path);
  console.log('   Methods:', Object.keys(uploadRoute.route.methods));
} else {
  console.log('❌ Upload route NOT found');
  console.log('Available routes:', stack
    .filter(layer => layer.route)
    .map(layer => `${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`)
  );
}

