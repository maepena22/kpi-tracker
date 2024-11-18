const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home route: Displays KPI form and table of records, including any error messages
app.get('/', async (req, res) => {
  const records = await db.getAllRecords();
  const error = req.query.error || null;
  db.getAllUsers()  // Replace with your actual method to fetch users
    .then(users => {
      db.getAllRecords()  // Replace with your actual method to fetch records
        .then(records => {
          res.render('index', { users: users, records: records });
        })
        .catch(err => {
          console.error('Error fetching records:', err);
          res.render('index', { error: 'KPI records could not be fetched.' });
        });
    })
    .catch(err => {
      console.error('Error fetching users:', err);
      res.render('index', { error: 'Users could not be fetched.' });
    });
});

// Route to add a KPI record
app.post('/add-kpi', async (req, res) => {
  const { user, date, calls, emails, appointments, quotation, contracts } = req.body;

  try {
    const existingRecord = await db.getRecordByUserAndDate(user, date);
    if (existingRecord) {
      return res.redirect('/?error=このユーザーの同じ日付のKPIレコードは既に存在します。');
    }
    await db.addRecord(user, date, calls, emails, appointments, quotation, contracts);
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


// Admin page route
app.get('/admin', async (req, res) => {
  const users = await db.getAllUsers();
  const kpiGoals = await db.getKpiGoals(); // Fetch the current KPI goals

  res.render('admin', {
    users,
    kpiGoals, // This will contain the current KPI goals
    successMessage: req.query.success || null,
    errorMessage: req.query.error || null
  });
});
// Route to add a new user
app.post('/admin/add-user', async (req, res) => {
  const { user } = req.body;
  try {
    await db.addUser(user);
    res.redirect('/admin?success=User added successfully');
  } catch (err) {
    res.redirect('/admin?error=Error adding user');
  }
});

// Route to delete a user
app.post('/admin/delete-user/:id', async (req, res) => {
  const { id } = req.params;
  await db.deleteUser(id);
  res.redirect('/admin?success=User deleted successfully');
});

app.post('/admin/update-goals', async (req, res) => {
  const { calls, emails, appointments, quotation, contracts } = req.body;
  

  try {
    // Update the KPI goals in the database
    await db.updateKpiGoals(calls, emails, appointments, quotation, contracts);

    // Redirect back to the admin page with a success message
    res.redirect('/admin?success=KPI Goals updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin?error=Failed to update KPI goals');
  }
});



app.get('/analytics-daily', async (req, res) => {
  const selectedDay = req.query.day || new Date().toISOString().slice(0, 10); // Default to today's date (YYYY-MM-DD)
  try {
    // Fetch users, kpi goals, and records for the selected day
    const users = await db.getAllUsers();
    const kpiGoals = await db.getKpiGoals();
    const records = await Promise.all(
      users.map(user => db.getUserKpiRecordsDaily(user.id, selectedDay))
    );
    
    // Render the page and pass selectedDay along with other data

    res.render('analytics-daily', {
      users,
      records,
      kpiGoals,
      selectedDay, // Ensure selectedDay is passed to the template
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching analytics data:', err);
    res.render('analytics-daily', { errorMessage: 'Failed to fetch analytics data.' });
  }
});



app.get('/analytics-monthly', async (req, res) => {
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);  // Default to the current month (YYYY-MM)
  
  try {
    const users = await db.getAllUsers();
    const kpiGoals = await db.getKpiGoals();
    
    const records = await Promise.all(
      users.map(user => {
        return db.getUserKpiRecords(user.id, selectedMonth);  // Get user's KPI records for the selected month
      })
    );
    
    console.log('Records:', records);
    res.render('analytics-monthly', {
      users,
      records,
      kpiGoals,
      selectedMonth,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching analytics data:', err);
    res.render('analytics-monthly', { errorMessage: 'Failed to fetch analytics data.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
