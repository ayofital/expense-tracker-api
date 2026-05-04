import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     parseInt(process.env.DB_PORT) || 3306,  // ← add this line
  waitForConnections: true,
  connectionLimit:    10,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,                                         // ← SSL for Railway
});

export default pool;