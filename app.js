const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const session = require('express-session');

const app = express();
const PORT = 3000;


const ADMIN_PASSWORD = 'Apex2020';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


// Configure session middleware
app.use(session({
  secret: 'kpiAppSecretKey', // Replace with a secure random string in production
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));


// Middleware to protect the admin page
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin-login');
}


// Admin login route
app.get('/admin-login', (req, res) => {
  const error = req.query.error || null;
  res.render('admin-login', { error }); // Create a simple login form in `admin-login.ejs`
});

app.post('/admin-login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  res.redirect('/admin-login?error=Invalid password');
});

app.get('/logout', function (req, res, next) {
  // logout logic

  // clear the user from the session object and save.
  // this will ensure that re-using the old session id
  // does not have a logged in user
  req.session.user = null
  req.session.save(function (err) {
    if (err) next(err)

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.redirect('/')
    })
  })
})

// Home route: Displays KPI form and table of records, including any error messages

app.get('/', async (req, res) => {
  const isLoggedIn = req.session?.isAdmin || false;
  const records = await db.getAllRecords();
  const error = req.query.error || null;
  db.getAllUsers()  
    .then(users => {
      db.getAllRecords()  
        .then(records => {
          console.log('Fetched records:', records);
          res.render('index', { users: users, records: records, isLoggedIn });
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
    // const existingRecord = await db.getRecordByUserAndDate(user, date);
    // if (existingRecord) {
    //   return res.redirect('/?error=このユーザーの同じ日付のKPIレコードは既に存在します。');
    // }
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
// Admin page route (protected)
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const kpiGoals = await db.getKpiGoals(); // Fetch the current KPI goals
    const isLoggedIn = req.session?.isAdmin || false;

    res.render('admin', {
      isLoggedIn,
      users,
      kpiGoals,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (err) {
    console.error('Error loading admin page:', err);
    res.render('admin', { errorMessage: 'Failed to load admin data.' });
  }
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
  const isLoggedIn = req.session?.isAdmin || false;
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
      isLoggedIn,
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
  const isLoggedIn = req.session?.isAdmin || false;
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);  // Default to the current month (YYYY-MM)
  
  try {
    const users = await db.getAllUsers();
    const kpiGoals = await db.getKpiGoals();
    
    const records = await Promise.all(
      users.map(user => {
        return db.getUserKpiRecords(user.id, selectedMonth);  // Get user's KPI records for the selected month
      })
    );
    
    res.render('analytics-monthly', {
      isLoggedIn,
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


// Route to get the record for editing
app.get('/edit-kpi/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const record = await db.getRecordById(id); // Fetch the record by ID
    const users = await db.getAllUsers(); // Fetch all users for the dropdown
   
    res.render('edit-kpi', { record, users });
  } catch (err) {
    console.error('Error fetching KPI record:', err);
    res.redirect('/?error=Failed to fetch KPI record.');
  }
});

// Route to update a KPI record
app.post('/edit-kpi/:id', async (req, res) => {
  const { id } = req.params;
  const { user, date, calls, emails, appointments, quotation, contracts } = req.body;

  try {
    await db.updateRecord(id, user, date, calls, emails, appointments, quotation, contracts);
    res.redirect('/?success=KPI record updated successfully.');
  } catch (err) {
    console.error('Error updating KPI record:', err);
    res.redirect(`/edit-kpi/${id}?error=Failed to update KPI record.`);
  }
});

// Report generation UI
app.get('/reports', async (req, res) => {
  const isLoggedIn = req.session?.isAdmin || false;
  try {
    const users = await db.getAllUsers();
    res.render('reports', { isLoggedIn, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.render('reports', { errorMessage: 'Failed to load data for reports.' });
  }
});

// Generate and download Excel report
app.post('/generate-report', async (req, res) => {
  const { users = [], dateRange } = req.body;

  // Process date range input
  let startDate = null;
  let endDate = null;
  if (dateRange) {
    const dates = dateRange.split(' to '); // Flatpickr returns "startDate to endDate" format for ranges
    startDate = dates[0];
    endDate = dates[1] || dates[0]; // If no range, use the same date for both start and end
  }

  try {
    // Fetch records from database
    const records = await db.getFilteredRecords(users, startDate, endDate);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('KPI Report');

    // Add headers
    sheet.columns = [
      { header: 'ユーザー名', key: 'username', width: 20 },
      { header: '日付', key: 'date', width: 15 },
      { header: 'コール数', key: 'calls', width: 10 },
      { header: '取得したメールアドレス数', key: 'emails', width: 10 },
      { header: '取得したアポイントメント数', key: 'appointments', width: 15 },
      { header: '見積書の獲得数', key: 'quotation', width: 15 },
      { header: '取得した契約数', key: 'contracts', width: 10 },
    ];

    // Add data rows
    records.forEach(record => {
      sheet.addRow({
        username: record.username,
        date: record.date,
        calls: record.calls,
        emails: record.emails,
        appointments: record.appointments,
        quotation: record.quotation,
        contracts: record.contracts,
      });
    });

    // Stream the Excel file to the client
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="kpi_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating report:', err);
    res.redirect('/reports?error=Failed to generate report.');
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
