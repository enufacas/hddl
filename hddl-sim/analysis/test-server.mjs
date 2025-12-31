import express from 'express';

const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Server still running after 5 seconds...');
}, 5000);
