-- Seed mission schemas based on the requirements document
-- This script populates existing missions with dynamic form schemas

-- A01 - My EVERYONE Pledge (5 commitments, all required)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    { "type": "textarea", "name": "commitment_1", "label": "Commitment 1", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
    { "type": "textarea", "name": "commitment_2", "label": "Commitment 2", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
    { "type": "textarea", "name": "commitment_3", "label": "Commitment 3", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
    { "type": "textarea", "name": "commitment_4", "label": "Commitment 4", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
    { "type": "textarea", "name": "commitment_5", "label": "Commitment 5", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." }
  ]
}'::jsonb
WHERE title ILIKE '%pledge%' OR title ILIKE '%everyone pledge%';

-- A02 - Customer Obsessed, Everyday (1-3 boxes: daily required; weekly/monthly optional)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    { "type": "textarea", "name": "daily_practice", "label": "Daily Practice", "required": true, "minRows": 4, "helperText": "What will you do every day?" },
    { "type": "textarea", "name": "weekly_ritual", "label": "Weekly Ritual", "required": false, "minRows": 4, "helperText": "What will you do weekly?" },
    { "type": "textarea", "name": "monthly_focus", "label": "Monthly Focus", "required": false, "minRows": 4, "helperText": "What will you focus on monthly?" }
  ]
}'::jsonb
WHERE title ILIKE '%customer obsessed%' OR title ILIKE '%everyday%';

-- CM01 - Frontliner Day (3 required mission questions)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    { "type": "textarea", "name": "q1", "label": "Mission Question 1", "required": true, "minRows": 5, "helperText": "Provide a detailed response to the first mission question." },
    { "type": "textarea", "name": "q2", "label": "Mission Question 2", "required": true, "minRows": 5, "helperText": "Provide a detailed response to the second mission question." },
    { "type": "textarea", "name": "q3", "label": "Mission Question 3", "required": true, "minRows": 5, "helperText": "Provide a detailed response to the third mission question." }
  ]
}'::jsonb
WHERE title ILIKE '%frontliner%' OR title ILIKE '%frontliner day%';

-- CM02 - Call Listening (repeat group of 3 call notes + 1 required summary)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    {
      "type": "group",
      "name": "calls",
      "label": "Call Notes",
      "repeat": { "min": 3, "max": 3 },
      "fields": [
        { "type": "textarea", "name": "notes", "label": "Notes for this call", "required": true, "minRows": 4, "helperText": "Document key points, customer feedback, and observations from this call." }
      ]
    },
    { "type": "textarea", "name": "summary", "label": "Overall Summary (What stood out? Pain points? Opportunities? Actions?)", "required": true, "minRows": 6, "helperText": "Provide a comprehensive summary addressing what stood out, pain points identified, opportunities discovered, and recommended actions." }
  ]
}'::jsonb
WHERE title ILIKE '%call listening%' OR title ILIKE '%listening%';

-- LM01 - Value Proposition 101 (2 required boxes: structure + kid-friendly pitch)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    { "type": "textarea", "name": "pitch_structure", "label": "Pitch Structure (Brand House cues)", "required": true, "minRows": 5, "helperText": "Structure your pitch using Brand House framework and key messaging cues." },
    { "type": "textarea", "name": "pitch_simple", "label": "Pitch to a 5-year-old", "required": true, "minRows": 4, "helperText": "Explain your value proposition in simple, plain language that a child could understand." }
  ]
}'::jsonb
WHERE title ILIKE '%value proposition%' OR title ILIKE '%proposition 101%';

-- LM02 - Social Listening (group of 3 interactions: URL + sentiment + response)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    {
      "type": "group",
      "name": "interactions",
      "label": "Social Interactions",
      "repeat": { "min": 3, "max": 3 },
      "fields": [
        { "type": "url", "name": "comment_url", "label": "Comment URL", "required": true, "helperText": "Provide the direct link to the social media comment or post." },
        { 
          "type": "select", 
          "name": "sentiment", 
          "label": "Sentiment", 
          "required": true,
          "options": [
            { "label": "Positive", "value": "positive" },
            { "label": "Neutral", "value": "neutral" },
            { "label": "Negative", "value": "negative" }
          ],
          "helperText": "Classify the overall sentiment of the interaction."
        },
        { "type": "textarea", "name": "response_text", "label": "Your Response", "required": true, "minRows": 3, "helperText": "Document your response or planned response to this interaction." }
      ]
    }
  ]
}'::jsonb
WHERE title ILIKE '%social listening%' OR title ILIKE '%listening%';

-- Elevates - Books/Podcasts/Videos/Articles (3-5 takeaways; first 3 required, 4-5 optional)
UPDATE missions 
SET submission_schema = '{
  "version": 1,
  "fields": [
    { "type": "textarea", "name": "takeaway_1", "label": "Key Takeaway 1", "required": true, "minRows": 3, "maxLength": 400, "helperText": "What was the most important insight or lesson from this content?" },
    { "type": "textarea", "name": "takeaway_2", "label": "Key Takeaway 2", "required": true, "minRows": 3, "maxLength": 400, "helperText": "What was the second most valuable insight you gained?" },
    { "type": "textarea", "name": "takeaway_3", "label": "Key Takeaway 3", "required": true, "minRows": 3, "maxLength": 400, "helperText": "What was the third key learning point?" },
    { "type": "textarea", "name": "takeaway_4", "label": "Key Takeaway 4 (Optional)", "required": false, "minRows": 3, "maxLength": 400, "helperText": "Any additional insights worth noting?" },
    { "type": "textarea", "name": "takeaway_5", "label": "Key Takeaway 5 (Optional)", "required": false, "minRows": 3, "maxLength": 400, "helperText": "Any final thoughts or reflections?" }
  ]
}'::jsonb
WHERE title ILIKE '%book%' OR title ILIKE '%podcast%' OR title ILIKE '%video%' OR title ILIKE '%article%' 
   OR title ILIKE '%small data%' OR title ILIKE '%delivering happiness%' OR title ILIKE '%cx cast%' 
   OR title ILIKE '%jobs wwdc%' OR title ILIKE '%sinek%' OR title ILIKE '%kriss%' OR title ILIKE '%elevate%';

-- Update max_submissions_per_user for missions that should allow multiple submissions
UPDATE missions 
SET max_submissions_per_user = 5
WHERE title ILIKE '%call listening%' OR title ILIKE '%social listening%';

-- Set default max_submissions_per_user for missions without it
UPDATE missions 
SET max_submissions_per_user = 1
WHERE max_submissions_per_user IS NULL;

-- Add some sample missions if none exist with these patterns
INSERT INTO missions (title, description, points_value, submission_schema, max_submissions_per_user, type)
SELECT * FROM (VALUES
  (
    'My EVERYONE Pledge',
    'Create your personal commitment to the EVERYONE values by defining 5 specific behaviors you will practice.',
    100,
    '{
      "version": 1,
      "fields": [
        { "type": "textarea", "name": "commitment_1", "label": "Commitment 1", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
        { "type": "textarea", "name": "commitment_2", "label": "Commitment 2", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
        { "type": "textarea", "name": "commitment_3", "label": "Commitment 3", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
        { "type": "textarea", "name": "commitment_4", "label": "Commitment 4", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." },
        { "type": "textarea", "name": "commitment_5", "label": "Commitment 5", "required": true, "minRows": 3, "helperText": "State a specific behavior you will practice." }
      ]
    }'::jsonb,
    1,
    'Alignment'
  ),
  (
    'Customer Obsessed, Everyday',
    'Define your daily, weekly, and monthly practices for staying customer-obsessed.',
    75,
    '{
      "version": 1,
      "fields": [
        { "type": "textarea", "name": "daily_practice", "label": "Daily Practice", "required": true, "minRows": 4, "helperText": "What will you do every day?" },
        { "type": "textarea", "name": "weekly_ritual", "label": "Weekly Ritual", "required": false, "minRows": 4, "helperText": "What will you do weekly?" },
        { "type": "textarea", "name": "monthly_focus", "label": "Monthly Focus", "required": false, "minRows": 4, "helperText": "What will you focus on monthly?" }
      ]
    }'::jsonb,
    1,
    'Alignment'
  ),
  (
    'Call Listening Session',
    'Listen to customer calls and document insights, pain points, and opportunities.',
    50,
    '{
      "version": 1,
      "fields": [
        {
          "type": "group",
          "name": "calls",
          "label": "Call Notes",
          "repeat": { "min": 3, "max": 3 },
          "fields": [
            { "type": "textarea", "name": "notes", "label": "Notes for this call", "required": true, "minRows": 4, "helperText": "Document key points, customer feedback, and observations from this call." }
          ]
        },
        { "type": "textarea", "name": "summary", "label": "Overall Summary (What stood out? Pain points? Opportunities? Actions?)", "required": true, "minRows": 6, "helperText": "Provide a comprehensive summary addressing what stood out, pain points identified, opportunities discovered, and recommended actions." }
      ]
    }'::jsonb,
    5,
    'Customer Mission'
  )
) AS new_missions(title, description, points_value, submission_schema, max_submissions_per_user, type)
WHERE NOT EXISTS (
  SELECT 1 FROM missions WHERE title = new_missions.title
);
