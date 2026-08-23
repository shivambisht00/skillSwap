# SkillSwap

## Task 1: Database + Project Scaffolding

This scaffold sets up the Node.js + Express server shell, MySQL connection pool, initial database schema, and demo seed data for later SkillSwap tasks.

Demo login password for every seeded user is `password123`.

Seed bcrypt hash used:

```text
$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq
```

### Create the MySQL database

```sql
CREATE DATABASE skillswap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'skillswap_user'@'localhost' IDENTIFIED BY 'replace-with-your-db-password';
GRANT ALL PRIVILEGES ON skillswap.* TO 'skillswap_user'@'localhost';
FLUSH PRIVILEGES;
```

### Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local MySQL credentials and a long random `JWT_SECRET`.

### Run migration and seed

```bash
mysql -u skillswap_user -p skillswap < migrations/001_init.sql
mysql -u skillswap_user -p skillswap < seed/seed.sql
```

### Install dependencies and start the server

```bash
npm install
npm run dev
```

The server starts on `PORT` from `.env`. The current scaffold exposes `/health` and an empty `/api` router; auth, skills, discover, messages, sessions, and sockets are added in later tasks.
