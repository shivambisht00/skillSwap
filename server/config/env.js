const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_PORT'
];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variable${missingEnvVars.length > 1 ? 's' : ''}: ${missingEnvVars.join(', ')}`
  );
}

const env = {
  jwtSecret: process.env.JWT_SECRET,
  port: Number(process.env.PORT),
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
  }
};

if (!Number.isInteger(env.port) || env.port <= 0) {
  throw new Error('PORT must be a positive integer.');
}

if (!Number.isInteger(env.db.port) || env.db.port <= 0) {
  throw new Error('DB_PORT must be a positive integer.');
}

module.exports = env;
