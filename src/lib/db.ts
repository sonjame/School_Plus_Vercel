import mysql from 'mysql2/promise'

export const db = mysql.createPool({
  host: 'localhost',
  user: 'schoolplus',
  password: 'schoolplus123!',
  database: 'schooling',
  waitForConnections: true,
  connectionLimit: 10,
})
