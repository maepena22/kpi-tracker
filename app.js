const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home route: Displays KPI form and table of records, including any error messages
app.get('/', async (req, res) => {
  const records = await db.getAllRecords();
  const error = req.query.error || null;
  res.render('index', { records, error });
});

// Route to add a KPI record
app.post('/add-kpi', async (req, res) => {
  const { user, date, calls, emails, appointments, acquisitions, contracts } = req.body;

  try {
    const existingRecord = await db.getRecordByUserAndDate(user, date);
    if (existingRecord) {
      return res.redirect('/?error=KPI record for this user on this date already exists.');
    }
    await db.addRecord(user, date, calls, emails, appointments, acquisitions, contracts);
    res.redirect('/');
  } catch (err) {
    res.redirect('/?error=An unexpected error occurred.');
  }
});

// Route to delete a KPI record
app.post('/delete-kpi/:id', async (req, res) => {
  const { id } = req.params;
  await db.deleteRecord(id);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
