# SkillSwap — Shared Contract (paste this into EVERY task prompt below)

⚠️ This file is the single source of truth. Every task (auth, discover, messages, sessions, video call, frontend) must follow it EXACTLY — same table names, same column names, same API paths, same response shapes. This is what makes it possible to build each piece with a different AI and merge them without conflicts.

Do not let any individual task's AI redesign this contract. If an AI thinks something here should change, it should tell you, not silently do it differently — otherwise the pieces won't merge.

## Tech stack
- Backend: Node.js + Express
- DB: MySQL (via `mysql2` driver, plain SQL queries — no ORM, to keep it simple and mergeable)
- Real-time: Socket.IO
- Auth: JWT (httpOnly cookie), bcrypt for password hashing

## Folder structure (every task must only create/edit files inside its own scope — see each task file)

```
/skillswap
  /client                 → existing frontend files (untouched paths)
    index.html
    login.html
    signup.html
    styles.css
    scripts.js
    video-call.js
    vcall_live_member_join.html
  /server
    server.js
    /config
      db.js
      env.js
    /routes
      auth.js
      users.js
      skills.js
      discover.js
      sessions.js
      messages.js
    /controllers
      authController.js
      discoverController.js
      sessionsController.js
      messagesController.js
    /middleware
      authMiddleware.js
      errorHandler.js
      validate.js
    /sockets
      chatSocket.js
      videoSignalSocket.js
  /migrations
    001_init.sql
  /seed
    seed.sql
  .env.example
  package.json
```

## Database schema (MySQL — every table's exact columns)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  initials VARCHAR(4),
  avatar_color VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50)
);

CREATE TABLE user_offer_skills (
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE user_want_skills (
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  matched_user_id INT NOT NULL,
  compatibility_score INT,
  status ENUM('suggested','connected','declined') DEFAULT 'suggested',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_id INT NOT NULL,
  guest_id INT NOT NULL,
  title VARCHAR(150),
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  status ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
  room_id VARCHAR(64) UNIQUE,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_a_id INT NOT NULL,
  user_b_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50),
  content VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API contract (every route, exact path + method + response shape)

All responses are JSON. All error responses: `{ "error": "message here" }` with proper HTTP status code.
All protected routes read JWT from httpOnly cookie `skillswap_token`.

```
POST   /api/auth/signup        { name, email, password }              → { user }
POST   /api/auth/login         { email, password }                    → { user }
POST   /api/auth/logout        —                                      → { success: true }
GET    /api/auth/me            (auth required)                        → { user }

GET    /api/skills                                                    → { skills: [{id,name,category}] }
GET    /api/discover           (auth required)                        → { matches: [{user, compatibility_score}] }

GET    /api/conversations      (auth required)                        → { conversations: [...] }
GET    /api/conversations/:id/messages (auth required)                → { messages: [...] }

GET    /api/sessions           (auth required)                        → { sessions: [...] }
POST   /api/sessions           (auth required) { guest_id, title, scheduled_at, duration_minutes } → { session }
PATCH  /api/sessions/:id       (auth required) { status }             → { session }
```

## Socket.IO events (exact event names)

```
Chat:
  client → server: "message:send"     { conversation_id, content }
  server → client: "message:receive"  { message }
  client → server: "typing"           { conversation_id }
  server → client: "read:receipt"     { conversation_id, message_id }

Video signaling (room = session.room_id):
  client → server: "video:join"       { room_id }
  server → client: "video:user-joined" { user }
  client → server: "video:offer"      { room_id, sdp }
  server → client: "video:offer"      { sdp, from }
  client → server: "video:answer"     { room_id, sdp }
  server → client: "video:answer"     { sdp, from }
  client → server: "video:ice-candidate" { room_id, candidate }
  server → client: "video:ice-candidate" { candidate, from }
  client → server: "video:leave"      { room_id }
  server → client: "video:user-left"  { user_id }
```

## User object shape (used everywhere)

```json
{ "id": 1, "name": "Sarah J.", "email": "sarah@example.com", "initials": "SJ", "avatar_color": "linear-gradient(135deg,#3b4fd8,#0cbfb0)", "bio": "..." }
```

---
Keep this file open/pasted alongside whichever numbered task file you're running.
