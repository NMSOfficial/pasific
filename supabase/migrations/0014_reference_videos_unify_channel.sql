-- Consolidates writing-type explainer videos onto a single consistent
-- source (YouTube channel "Teacher Phill", Cambridge B2 First writing
-- series) wherever a matching video exists, instead of a different
-- channel per type. Descriptive writing and blog post aren't part of
-- that exam's writing paper, so they keep their previously-sourced videos.

update reference_videos set title = 'Cambridge B2 First (FCE): How to Write an Essay', youtube_url = 'https://www.youtube.com/watch?v=CfG1Y_XEYtU', channel_name = 'Teacher Phill'
  where subject_type = 'writing_type' and subject_id in (
    'opinion_essay', 'argumentative_essay', 'for_and_against_essay', 'advantages_disadvantages_essay',
    'problem_solution_essay', 'cause_effect_essay', 'compare_contrast_essay'
  );

update reference_videos set title = 'Cambridge B2 First (FCE) - How to Write an Article', youtube_url = 'https://www.youtube.com/watch?v=oBT1bOHxbpA', channel_name = 'Teacher Phill'
  where subject_type = 'writing_type' and subject_id = 'article';

update reference_videos set channel_name = 'Teacher Phill'
  where subject_type = 'writing_type' and subject_id in ('report', 'review');

update reference_videos set title = 'Cambridge B2 First (FCE) - How To Write A Story', youtube_url = 'https://www.youtube.com/watch?v=zmyLYUolkpU', channel_name = 'Teacher Phill'
  where subject_type = 'writing_type' and subject_id = 'narrative_story';

update reference_videos set title = 'Cambridge B2 First (FCE) - How to Write Emails & Letters', youtube_url = 'https://www.youtube.com/watch?v=XD-rgdF2nBQ', channel_name = 'Teacher Phill'
  where subject_type = 'writing_type' and subject_id in ('formal_email', 'informal_email', 'complaint_letter', 'application_letter');
