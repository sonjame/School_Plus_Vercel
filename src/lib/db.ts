import mysql from 'mysql2/promise'

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'railway',

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  // 🔥 핵심 추가
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

export default db
