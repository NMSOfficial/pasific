-- Category-specific reference videos for as many of the 42 error_categories
-- as a real, clearly on-topic, currently-live YouTube video could be found
-- for via web search. Two categories (unsupported_idea,
-- missing_required_section) didn't turn up a clean specific match and are
-- deliberately left out — fetchVideoForErrorCategory() already falls back
-- to the category's error_group video (seeded in 0013) for those, and for
-- any category not listed here at all.

insert into reference_videos (subject_type, subject_id, title, youtube_url, channel_name) values
  -- grammar
  ('error_category', 'verb_tense', 'English Grammar - Past Simple & Present Perfect', 'https://www.youtube.com/watch?v=6IilS4SEqyA', 'engVid'),
  ('error_category', 'subject_verb_agreement', '5 Subject-Verb Agreement Rules in English Grammar', 'https://www.youtube.com/watch?v=4NkXM1j3seA', null),
  ('error_category', 'articles', 'A, AN, THE - Articles in English', 'https://www.youtube.com/watch?v=3zJQoQLCeNo', 'engVid'),
  ('error_category', 'prepositions', '10 Common Mistakes with Verbs & Prepositions in English', 'https://www.youtube.com/watch?v=y4J66J3l8P4', 'engVid'),
  ('error_category', 'singular_plural', 'COUNTABLE and UNCOUNTABLE nouns in English (with EXCEPTIONS!)', 'https://www.youtube.com/watch?v=-J_k31UU3zE', null),
  ('error_category', 'pronouns', 'Confusing Subject & Object Pronouns: HE or HIM? I or ME? SHE AND I or HER AND I...?', 'https://www.youtube.com/watch?v=boxixZkx0WU', null),
  ('error_category', 'word_order', 'Word Order (Sentence Structure) | English Grammar Lesson (Part 1) | B1-Intermediate', 'https://www.youtube.com/watch?v=VPyo8-Pr55Q', null),
  ('error_category', 'modal_verbs', 'Common mistakes with modal verbs in English', 'https://www.youtube.com/watch?v=c8YDG8pUbOc', 'Learn English with Cambridge'),
  ('error_category', 'conditionals', 'Conditionals or If clauses (zero, first, second, third & mixed conditionals)', 'https://www.youtube.com/watch?v=zxw-MeIoEu0', null),
  ('error_category', 'relative_clauses', 'Relative Clauses: WHO, WHOM, THAT, WHICH', 'https://www.youtube.com/watch?v=BMpSHDEvmPY', null),
  ('error_category', 'sentence_fragments', 'Sentence Fragments & How to Fix Them | How to Write Complete Sentences', 'https://www.youtube.com/watch?v=hfXbyn8P0_k', 'English Writing Essentials'),
  ('error_category', 'run_on_sentences', 'Run-On Sentences and How To Fix Them', 'https://www.youtube.com/watch?v=nYc0rzqiQQE', 'English Writing Essentials'),
  ('error_category', 'clause_structure', 'Independent and Dependent Clauses', 'https://www.youtube.com/watch?v=y2vCSPWcvNw', null),
  ('error_category', 'agreement', 'Pronoun-Antecedent Agreement', 'https://www.youtube.com/watch?v=_cMSaylbLTY', null),
  ('error_category', 'auxiliary_verbs', 'English Grammar: AUXILIARY VERBS - be, do, have', 'https://www.youtube.com/watch?v=HHt52kFa2ow', null),

  -- vocabulary
  ('error_category', 'word_choice', 'Word Choice in Writing', 'https://www.youtube.com/watch?v=Bm-oyJE-JvU', null),
  ('error_category', 'word_form', 'Turn NOUNS & VERBS into ADJECTIVES!', 'https://www.youtube.com/watch?v=JSXHFAAM_xU', 'engVid'),
  ('error_category', 'collocation', 'Collocations in English - Learn English Vocabulary', 'https://www.youtube.com/watch?v=CqRloBkyqQs', null),
  ('error_category', 'repetition', 'Synonyms: The Key to Avoiding Repetition', 'https://www.youtube.com/watch?v=96jQlowZhng', null),
  ('error_category', 'register', 'Master Tone and Register in C1 Writing | Formal vs Informal English Explained', 'https://www.youtube.com/watch?v=oWVaK_0GDkc', null),
  ('error_category', 'informal_language', 'Using Formal Language in Academic Writing', 'https://www.youtube.com/watch?v=BwQowyBUOYA', null),
  ('error_category', 'false_friend', 'Common mistakes with English vocabulary: 15 false friends', 'https://www.youtube.com/watch?v=zKrgN6Qhu7I', null),
  ('error_category', 'spelling', 'English Spelling Rules - Learn Spelling Rules and Common Mistakes', 'https://www.youtube.com/watch?v=IWPfD2WcAXg', null),
  ('error_category', 'precision', 'Using Precise Words - Everyday Writing', 'https://www.youtube.com/watch?v=FsCukebKvFc', 'Coach Write'),
  ('error_category', 'limited_range', '69 Advanced Words (C1 + C2) to Get a Band 9', 'https://www.youtube.com/watch?v=_s1rIKaoAyM', null),

  -- organisation (unsupported_idea intentionally omitted, see header note)
  ('error_category', 'missing_thesis', 'How to Write a Strong Thesis Statement | Step-by-Step Essay Writing Guide', 'https://www.youtube.com/watch?v=ANq1tEf-I1Q', null),
  ('error_category', 'weak_topic_sentence', 'How to Write GREAT Topic Sentences: Essay Writing (3 Steps + Examples)', 'https://www.youtube.com/watch?v=M5CbbpAbBQs', null),
  ('error_category', 'weak_paragraph_focus', 'Paragraph Unity: What It Is, How to Get It', 'https://www.youtube.com/watch?v=HrT7dTcAGAQ', null),
  ('error_category', 'repeated_idea', 'Tips to eliminate redundancy in essay writing', 'https://www.youtube.com/watch?v=d_rpVzKlii8', null),
  ('error_category', 'incorrect_linking_device', 'How to use Transition Words and Sentences in Essays', 'https://www.youtube.com/watch?v=CpDTxvxuFpM', 'Scribbr'),
  ('error_category', 'mechanical_cohesion', 'Coherence and Cohesion in the IELTS Writing test', 'https://www.youtube.com/watch?v=EWLelXJ2ecM', null),
  ('error_category', 'missing_conclusion', 'How to Write a Strong Essay Conclusion', 'https://www.youtube.com/watch?v=2UElC_YZ0Eo', 'Scribbr'),
  ('error_category', 'unclear_reference', 'How Can I Fix Vague Pronoun References?', 'https://www.youtube.com/watch?v=ekzCUAwZRwo', null),
  ('error_category', 'poor_progression', 'How to Create Coherence and Cohesion in Essay Writing - Make Your Ideas Flow Naturally', 'https://www.youtube.com/watch?v=wcA6ShCVyiw', null),

  -- task_genre (missing_required_section intentionally omitted, see header note)
  ('error_category', 'partially_answered_prompt', 'Answer all parts of the IELTS Question (Task Response)', 'https://www.youtube.com/watch?v=_4jnJmC2wls', null),
  ('error_category', 'off_topic_content', 'Four Common Essay Mistakes part 2: writing off topic', 'https://www.youtube.com/watch?v=6HJcPy0-RQs', null),
  ('error_category', 'missing_position', 'Stating Your Opinion - How To Write an Opinion Statement', 'https://www.youtube.com/watch?v=UCJu8TWGnfg', null),
  ('error_category', 'inappropriate_register', 'Master Tone and Register in C1 Writing | Formal vs Informal English Explained', 'https://www.youtube.com/watch?v=oWVaK_0GDkc', null),
  ('error_category', 'genre_convention_issue', 'How To Write An Essay: Structure', 'https://www.youtube.com/watch?v=6PnsKg7hkIo', null),
  ('error_category', 'insufficient_development', 'Supporting Details | Specific Examples | English Writing Skills', 'https://www.youtube.com/watch?v=OZr3nhK5TI8', null)
on conflict (subject_type, subject_id) do update set
  title = excluded.title, youtube_url = excluded.youtube_url, channel_name = excluded.channel_name;
