const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// Fallback to index.html for root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


