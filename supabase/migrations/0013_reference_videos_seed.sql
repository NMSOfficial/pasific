-- One real, currently-indexed YouTube video per writing type (genre
-- explainer) and one per error group (grammar/vocabulary/organisation/
-- task_genre fix-it video), sourced via web search. Titles/URLs as found;
-- spot-check a few after this runs since nothing here was played back to
-- verify it's still live.

insert into reference_videos (subject_type, subject_id, title, youtube_url, channel_name) values
  ('writing_type', 'opinion_essay', 'Write a Killer OPINION ESSAY! Step-by-Step Guide for B2/C1', 'https://www.youtube.com/watch?v=zjsk_-B_MTM', null),
  ('writing_type', 'argumentative_essay', 'How to Write an Argumentative Essay in English | Structure', 'https://www.youtube.com/watch?v=hY4NQnOuxH4', null),
  ('writing_type', 'for_and_against_essay', 'How to write a For and Against Essay the easy way', 'https://www.youtube.com/watch?v=2Czs4w8aI7M', null),
  ('writing_type', 'advantages_disadvantages_essay', 'How to Write an Advantages-Disadvantages Essay', 'https://www.youtube.com/watch?v=nRStzvEsPlM', null),
  ('writing_type', 'problem_solution_essay', 'How to Write a Problem Solution Essay | Structure Overview | English Writing Skills', 'https://www.youtube.com/watch?v=4yxGj1Vcsb4', null),
  ('writing_type', 'cause_effect_essay', 'How to Write a Cause and Effect Essay', 'https://www.youtube.com/watch?v=RCu2VSVuBbU', null),
  ('writing_type', 'compare_contrast_essay', 'How to Write a Compare and Contrast Essay (It''s Easy!)', 'https://www.youtube.com/watch?v=oKuK4Pu5Jbk', null),
  ('writing_type', 'formal_email', 'How to write a formal email | professional email structure', 'https://www.youtube.com/watch?v=5yAL98Hci6I', 'HOW TO ENGLISH'),
  ('writing_type', 'informal_email', 'How to write informal emails in English', 'https://www.youtube.com/watch?v=llqPvcciKEM', null),
  ('writing_type', 'complaint_letter', 'English Writing Skills - Writing a Letter of Complaint', 'https://www.youtube.com/watch?v=XKoIb7a_bLI', null),
  ('writing_type', 'application_letter', 'Top tips for writing a cover letter in English', 'https://www.youtube.com/watch?v=E_kWz09Etcc', 'Learn English with Rebecca [engVid]'),
  ('writing_type', 'article', 'Cambridge First B2: How to write a great article', 'https://www.youtube.com/watch?v=OMsu3YqlVGI', null),
  ('writing_type', 'report', 'Cambridge B2 First (FCE): How to Write a Report', 'https://www.youtube.com/watch?v=wlNQYrYEF5A', null),
  ('writing_type', 'review', 'Cambridge B2 First (FCE): How to Write a Review', 'https://www.youtube.com/watch?v=ZNWIe0EAirI', null),
  ('writing_type', 'narrative_story', '9-1 GCSE English Language: how to write the perfect narrative (short story)', 'https://www.youtube.com/watch?v=TJR0ozt_I0Y', null),
  ('writing_type', 'descriptive_writing', 'English Writing Tips - How To Write Descriptive English For Essays, Email, IELTS | Creative Writing', 'https://www.youtube.com/watch?v=WHOwM0E6txU', null),
  ('writing_type', 'blog_post', 'How to Write a Blog Post for Beginners: From Start to End', 'https://www.youtube.com/watch?v=KkKp56E6UVo', null),

  ('error_group', 'grammar', '10 Most Common English Grammar Mistakes And How to Fix Them!', 'https://www.youtube.com/watch?v=R_73373daLE', null),
  ('error_group', 'vocabulary', 'How to Improve Your Vocabulary in Writing', 'https://www.youtube.com/watch?v=DwQFll2LrFg', null),
  ('error_group', 'organisation', 'Coherence & Cohesion in Academic Essay Writing', 'https://www.youtube.com/watch?v=RTDGDZCaVkY', null),
  ('error_group', 'task_genre', 'English Essay: How to Write about ANY Essay Topic', 'https://www.youtube.com/watch?v=GNL1_tNTqpw', null)
on conflict (subject_type, subject_id) do update set
  title = excluded.title, youtube_url = excluded.youtube_url, channel_name = excluded.channel_name;
