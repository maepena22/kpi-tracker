const sqlite3 = require('sqlite3').verbose();
// Change ':memory:' to a file path, e.g., 'kpi-tracker.db'
const db = new sqlite3.Database('./kpi-tracker.db');
// Initialize database and create table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS kpi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      date TEXT NOT NULL,
      calls INTEGER NOT NULL,
      emails INTEGER NOT NULL,
      appointments INTEGER NOT NULL,
      quotation INTEGER NOT NULL,
      contracts INTEGER NOT NULL,
      UNIQUE(user, date)
    )
  `);

   // Users table
   db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE
    )
  `);

  // KPI goals table
  db.run(`
    CREATE TABLE IF NOT EXISTS kpi_goals (
      id INTEGER PRIMARY KEY,
      calls REAL NOT NULL,
      emails REAL NOT NULL,
      appointments REAL NOT NULL,
      quotation REAL NOT NULL,
      contracts REAL NOT NULL
    )
  `);

  db.get('SELECT * FROM kpi_goals WHERE id = 1', (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO kpi_goals (id, calls, emails, appointments, quotation, contracts)
        VALUES (1, 1, 1, 1, 1, 1)
      `);
    }
  });
});

const getAllRecords = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT kpi.*, users.username
      FROM kpi
      JOIN users ON kpi.user = users.id
    `;
    db.all(query, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};


// Add a new KPI record
const addRecord = (user, date, calls, emails, appointments, quotation, contracts) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO kpi (user, date, calls, emails, appointments, quotation, contracts) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user, date, calls, emails, appointments, quotation, contracts],
      function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      }
    );
  });
};

// Get a record by user and date (for duplicate check)
const getRecordByUserAndDate = (user, date) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM kpi WHERE user = ? AND date = ?`, [user, date], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};

// Delete a KPI record by ID
const deleteRecord = (id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM kpi WHERE id = ?`, id, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};


// Add a new user
const addUser = (user) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (username) VALUES (?)',
      [user],
      function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      }
    );
  });
};

// Get all users
const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

// Delete a user by ID
const deleteUser = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};
const updateKpiGoals = (calls, emails, appointments, quotation, contracts) => {
  return new Promise((resolve, reject) => {
    console.log('Updating KPI goals:', { calls, emails, appointments, quotation, contracts }); // Log the values
    db.run(
      `INSERT OR REPLACE INTO kpi_goals (id, calls, emails, appointments, quotation, contracts)
       VALUES (1, ?, ?, ?, ?, ?)`,
      [calls, emails, appointments, quotation, contracts],
      (err) => {
        if (err) {
          console.error('Error updating KPI goals:', err);
          reject(err);
        } else {
          console.log('KPI goals updated successfully');
          resolve(); // Successfully updated
        }
      }
    );
  });
};

// Get the current KPI goals from the kpi_goals table
const getKpiGoals = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM kpi_goals WHERE id = 1', (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};

const getUserKpiRecords = (userId, month) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM kpi 
      WHERE user = ? AND strftime('%Y-%m', date) = ?`;
    db.all(query, [userId, month], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const getUserKpiRecordsDaily = (userId, day) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM kpi 
      WHERE user = ? AND strftime('%Y-%m-%d', date) = ?`;
    db.all(query, [userId, day], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};



module.exports = { getUserKpiRecordsDaily, getUserKpiRecords, getKpiGoals, getAllRecords, addRecord, getRecordByUserAndDate, deleteRecord, addUser, getAllUsers, deleteUser, updateKpiGoals };
