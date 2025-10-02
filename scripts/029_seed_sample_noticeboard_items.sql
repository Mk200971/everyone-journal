-- Insert sample noticeboard items for testing
INSERT INTO public.noticeboard_items (title, content, author, author_title, year, image_url, is_active, display_order) VALUES
(
  'Customer Excellence',
  'Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution; it represents the wise choice of many alternatives.',
  'Aristotle',
  'Ancient Greek Philosopher',
  '384 BC',
  '/professional-woman.png',
  true,
  1
),
(
  'Innovation Mindset',
  'The way to get started is to quit talking and begin doing. Innovation distinguishes between a leader and a follower.',
  'Steve Jobs',
  'Co-founder of Apple Inc.',
  '2005',
  '/professional-man.png',
  true,
  2
),
(
  'Team Collaboration',
  'Alone we can do so little; together we can do so much. Great things in business are never done by one person; they are done by a team of people.',
  'Helen Keller',
  'Author and Activist',
  '1929',
  '/woman-scientist.png',
  true,
  3
);
