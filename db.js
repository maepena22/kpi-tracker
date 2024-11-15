const sqlite3 = require('sqlite3').verbose();
// Change ':memory:' to a file-based database
const db = new sqlite3.Database('./kpi.db');

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
      acquisitions INTEGER NOT NULL,
      contracts INTEGER NOT NULL,
      UNIQUE(user, date)
    )
  `);
});

// Get all KPI records
const getAllRecords = () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM kpi`, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

// Add a new KPI record
const addRecord = (user, date, calls, emails, appointments, acquisitions, contracts) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO kpi (user, date, calls, emails, appointments, acquisitions, contracts) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user, date, calls, emails, appointments, acquisitions, contracts],
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

module.exports = { getAllRecords, addRecord, getRecordByUserAndDate, deleteRecord };
