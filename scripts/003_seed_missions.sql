-- Insert sample missions
INSERT INTO public.missions (title, description, points_value) VALUES
('Share Your Morning Routine', 'Document and share your morning routine that helps you start the day positively. Include at least 3 specific activities.', 50),
('Random Act of Kindness', 'Perform a random act of kindness for someone and share the story. It can be as simple as holding a door or helping a neighbor.', 75),
('Learn Something New', 'Spend 30 minutes learning a new skill or topic. Share what you learned and how you might apply it.', 60),
('Digital Detox Hour', 'Spend one hour completely disconnected from digital devices. Share how you spent the time and how it felt.', 40),
('Gratitude Practice', 'Write down 5 things you are grateful for today and explain why each one is meaningful to you.', 30),
('Help a Community Member', 'Assist someone in your community with a task or problem. Document the experience and its impact.', 100)
ON CONFLICT DO NOTHING;
