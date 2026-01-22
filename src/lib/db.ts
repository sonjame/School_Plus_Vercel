import mysql from 'mysql2/promise'

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 5,
})

export default db
