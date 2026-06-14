const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SLV Events API Server running on port ${PORT}`);
  console.log(`📡 Health Check available at http://localhost:${PORT}/health`);
  console.log(`🌐 Demo Mode status: Run server and inspect startup output`);
});
