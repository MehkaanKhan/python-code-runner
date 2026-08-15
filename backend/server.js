const express = require('express');
const cors = require('cors');
const eventsRouter = require('./src/routes/events');
const adminRouter = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

app.use(cors());
app.use(express.json());

app.use('/api', eventsRouter);
app.use('/', adminRouter);

app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
  console.log(`Admin stats: http://${HOST}:${PORT}/admin`);
});
