-- Demo password for every user: password123
-- Bcrypt hash used: $2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq

INSERT INTO users (id, name, email, password_hash, initials, avatar_color, bio) VALUES
  (1, 'Sarah Johnson', 'sarah@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'SJ', 'linear-gradient(135deg,#3b4fd8,#0cbfb0)', 'Product designer who loves helping people make interfaces clearer and kinder.'),
  (2, 'Miguel Santos', 'miguel@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'MS', 'linear-gradient(135deg,#f97316,#ef4444)', 'Full-stack developer focused on practical web apps and clean APIs.'),
  (3, 'Aisha Khan', 'aisha@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'AK', 'linear-gradient(135deg,#8b5cf6,#ec4899)', 'Marketing strategist learning more technical skills for analytics projects.'),
  (4, 'Leo Chen', 'leo@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'LC', 'linear-gradient(135deg,#06b6d4,#2563eb)', 'Language tutor and operations lead with a soft spot for spreadsheets.'),
  (5, 'Priya Raman', 'priya@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'PR', 'linear-gradient(135deg,#10b981,#84cc16)', 'Backend engineer who enjoys mentoring beginners in databases and Node.js.'),
  (6, 'Noah Williams', 'noah@example.com', '$2b$10$19uSQw//CqpUgHjlmiYHwucppaMjBSj7vExvQpWDd/Rl/H/HIHviq', 'NW', 'linear-gradient(135deg,#64748b,#14b8a6)', 'Freelance consultant improving his design, Spanish, and pitching skills.');

INSERT INTO skills (id, name, category) VALUES
  (1, 'UI Design', 'Design'),
  (2, 'UX Research', 'Design'),
  (3, 'Figma Prototyping', 'Design'),
  (4, 'Brand Identity', 'Design'),
  (5, 'JavaScript', 'Programming'),
  (6, 'Node.js', 'Programming'),
  (7, 'MySQL', 'Programming'),
  (8, 'React', 'Programming'),
  (9, 'Python', 'Programming'),
  (10, 'Spanish', 'Languages'),
  (11, 'French', 'Languages'),
  (12, 'Hindi', 'Languages'),
  (13, 'Marketing Strategy', 'Business'),
  (14, 'Pitch Decks', 'Business'),
  (15, 'Project Management', 'Business');

INSERT INTO user_offer_skills (user_id, skill_id) VALUES
  (1, 1), (1, 2), (1, 3),
  (2, 5), (2, 6), (2, 8),
  (3, 13), (3, 14), (3, 15),
  (4, 10), (4, 11), (4, 15),
  (5, 6), (5, 7), (5, 9),
  (6, 13), (6, 14), (6, 10);

INSERT INTO user_want_skills (user_id, skill_id) VALUES
  (1, 5), (1, 8), (1, 14),
  (2, 1), (2, 2), (2, 13),
  (3, 5), (3, 7), (3, 10),
  (4, 6), (4, 8), (4, 14),
  (5, 1), (5, 3), (5, 13),
  (6, 2), (6, 3), (6, 12);

INSERT INTO matches (id, user_id, matched_user_id, compatibility_score, status) VALUES
  (1, 1, 2, 92, 'suggested'),
  (2, 2, 1, 88, 'suggested'),
  (3, 3, 5, 84, 'connected'),
  (4, 5, 3, 81, 'connected'),
  (5, 4, 6, 76, 'suggested'),
  (6, 6, 4, 74, 'suggested');

INSERT INTO sessions (id, host_id, guest_id, title, scheduled_at, duration_minutes, status, room_id) VALUES
  (1, 2, 1, 'JavaScript fundamentals for designers', '2026-09-04 15:00:00', 45, 'scheduled', 'room-js-design-001'),
  (2, 5, 3, 'MySQL basics for campaign analytics', '2026-09-06 10:30:00', 60, 'scheduled', 'room-mysql-analytics-002'),
  (3, 4, 6, 'Spanish conversation practice', '2026-09-09 18:00:00', 30, 'scheduled', 'room-spanish-practice-003');

INSERT INTO conversations (id, user_a_id, user_b_id) VALUES
  (1, 1, 2),
  (2, 3, 5),
  (3, 4, 6);

INSERT INTO messages (conversation_id, sender_id, content) VALUES
  (1, 1, 'Hi Miguel, I would love to trade UI feedback for JavaScript help.'),
  (1, 2, 'That sounds great. I can help you prep a small practice project.'),
  (2, 3, 'Priya, could we focus on database queries for marketing dashboards?'),
  (2, 5, 'Absolutely. Bring a sample report and we can model the tables together.'),
  (3, 6, 'Leo, I am hoping to practice everyday Spanish for client calls.'),
  (3, 4, 'Perfect. We can start with introductions and scheduling phrases.');

INSERT INTO notifications (user_id, type, content, is_read) VALUES
  (1, 'match', 'Miguel is a strong match for JavaScript help.', FALSE),
  (3, 'session', 'Your MySQL basics session is scheduled.', FALSE),
  (6, 'message', 'Leo replied to your Spanish practice message.', FALSE);
