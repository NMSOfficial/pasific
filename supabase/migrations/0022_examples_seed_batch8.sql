-- Pasific Library batch 8: original examples for narrative_story,
-- descriptive_writing and blog_post, spanning B1-C1 across
-- developing/meets/strong/advanced bands. Written from scratch for Pasific
-- to match the app's rubric-criterion and annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'narrative_story', 'B1', 'The Lost Wallet — Developing B1 Response', 'Last Friday, I walk to school like every day. When I arrive, I open my bag to take my book and I realise my wallet is not there.

I feel very worried because my wallet have my bus card and some money inside. I try to remember where I was last time I use it. I think maybe I drop it near the bus stop.

After school finish, I run to the bus stop and look everywhere on the ground. I dont find nothing. I was very sad and I start walk home.

Suddenly, a old man call me. He was holding my wallet! He find it near the bus stop and he wait there because he hope I come back.

I thank him many time and I offer him some money, but he say no. This day teach me that there is still kind people in the world.',
    52, 'developing',
    array['Clear narrative with a beginning, problem, and resolution','Ends with a genuine reflection, matching the genre expectation'], array['Frequent past tense errors (present tense used for past events)','Double negative (''dont find nothing'')'], 'The story has a clear structure with a problem and satisfying resolution, but frequent past tense errors (using present tense verbs for past events) keep it at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'A complete story with a problem and resolution is told, ending with a personal reflection.', 'This day teach me that there is still kind people in the world.', array['Satisfying resolution with a genuine reflection'], array['Add more description of feelings at the moment of losing the wallet']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows a clear narrative structure appropriate to the genre.', null, array['Clear chronological storytelling'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Events are told in a clear chronological order with basic time linkers.', 'After school finish, I run to the bus stop', array['Clear time sequence throughout'], array['Use a wider range of time linkers than ''after'' and ''suddenly''']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for a personal narrative.', null, array['Correct use of ''worried'', ''suddenly'''], array['Try ''anxious'' or ''relieved'' for more precise emotion words']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors using present tense forms for past events.', 'Last Friday, I walk to school like every day.', array[]::text[], array['Review past simple forms throughout the narrative','Review double negatives (''I don''t find anything'', not ''I dont find nothing'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 30, 'Last Friday, I walk to school', 'mistake', 'verb_tense', '''Last Friday'' signals the past simple, so ''walked'' is needed, not the base form ''walk''.', 'Narratives about the past need past simple verbs throughout.', 'Last Friday, I walked to school'),
    (0, 25, 'I dont find nothing', 'mistake', 'word_order', 'English doesn''t use double negatives; use ''anything'' with the negative verb, not ''nothing''.', null, 'I didn''t find anything')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'narrative_story', 'B2', 'The Storm — Meets Expectations B2 Response', 'The sky had been darkening all afternoon, but none of us at the campsite had taken it seriously until the first crack of thunder shook the ground beneath our tents.

Within minutes, what had started as a light drizzle became a genuine downpour. Sam, ever the practical one, immediately began securing the tent pegs while Maya and I scrambled to gather the equipment we had left scattered around the fire pit. The wind picked up so suddenly that our folding table was sent tumbling across the campsite before any of us could catch it.

By the time we had finally packed everything into the car, we were completely soaked, but strangely, nobody seemed particularly upset about it. Maya, dripping wet, started laughing first, and within seconds the rest of us had joined her, sitting in the steamed-up car as rain hammered relentlessly on the roof.

Looking back, that ruined camping trip has somehow become one of my favourite memories with them — proof, perhaps, that the moments which go wrong are often the ones we remember most fondly.',
    85, 'strong',
    array['Vivid, sensory detail throughout (''crack of thunder'', ''steamed-up car'')','Natural, engaging narrative voice with a genuine emotional arc','Effective, memorable closing reflection'], array['Dialogue could add extra immediacy to the scene'], 'A strong response with vivid sensory detail and a genuine emotional turn (from panic to shared laughter) that gives the story real narrative shape rather than a flat sequence of events.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'A complete, engaging story is told with a genuine emotional arc and a memorable reflection.', 'the moments which go wrong are often the ones we remember most fondly', array['Genuine emotional shift from panic to shared laughter'], array['Add a line of dialogue for extra immediacy']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Strong command of narrative technique, including character detail and sensory description.', null, array['Individual character traits (Sam the practical one) add texture'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 17, 'Well-organised chronological narrative with varied, natural time linkers.', 'Within minutes, what had started as a light drizzle became a genuine downpour.', array['Smooth, varied time progression throughout'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of vivid, precise vocabulary well suited to narrative writing.', null, array['''hammered relentlessly'', ''steamed-up car'' show vivid sensory vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Grammar is accurate throughout, including past perfect used correctly for background events.', null, array['Accurate, natural use of past perfect (''had been darkening'', ''had started'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'narrative_story', 'C1', 'The Last Train — Strong C1 Response', 'There is a particular kind of silence that settles over a station platform after the last train has been announced, and it was into this silence that I stepped, coat collar raised against a wind that seemed determined to find every gap in it.

I hadn''t planned to be there. An hour earlier, I had been sitting across from her in a café that neither of us would probably ever return to, turning a coffee cup slowly in my hands while she said the things that needed saying, calmly, without cruelty, which somehow made it worse. I had walked afterwards without any real direction, and found, without particularly choosing to, that my feet had brought me here.

The departures board flickered, indifferent. Twelve minutes. I thought, not for the first time that evening, about how strange it was that a life could be reorganised so completely in the space of an afternoon, and how the world outside — the flickering board, the pigeons picking at abandoned chips, a distant announcement about delays on another line entirely — carried on as though nothing whatsoever had happened.

When the train finally pulled in, I didn''t get on it. I simply watched it leave, taillights shrinking into the dark, and felt, for the first time since the café, something that might eventually, with time, resemble relief.',
    96, 'advanced',
    array['Sophisticated literary technique (indirect emotional revelation rather than exposition)','Precise, evocative sensory and psychological detail','Genuinely controlled narrative voice with a distinctive, mature style'], array[]::text[], 'An exemplary C1/C2-level narrative: the emotional content (a breakup) is never stated directly but conveyed entirely through implication and physical detail — a genuinely sophisticated literary technique handled with real control.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 19, 'A complete, emotionally sophisticated story is told with genuine narrative craft.', 'how strange it was that a life could be reorganised so completely in the space of an afternoon', array['The breakup is revealed entirely through implication, never stated directly'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful command of narrative technique, including a genuinely literary voice.', null, array['Distinctive, controlled prose style throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 19, 'Sophisticated structure moving fluidly between present moment and recent memory.', 'I hadn''t planned to be there. An hour earlier, I had been sitting across from her', array['Smooth, controlled movement between timeframes'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, evocative vocabulary used with complete stylistic control.', null, array['''departures board flickered, indifferent'' shows genuine literary precision'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex, controlled sentence structures used with confidence throughout.', null, array['Confident use of long, layered sentences balanced against short ones for effect'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'descriptive_writing', 'B1', 'My Bedroom — Developing B1 Response', 'My bedroom is not very big but I like it a lot. It is on the second floor of my house, next to the bathroom.

When you enter, you can see my bed near the window. I like this because I can see the sky when I wake up. Next to the bed, there is a small table with my lamp and some book.

The wall is painted in light blue color, my favourite color. I have many poster on the wall, mostly from my favourite football team.

In the corner, there is my desk where I do my homework. It is always a little messy because I have many paper and pen everywhere.

Even if it is small, my bedroom is my favourite place in the house because it is quiet and it is only mine.',
    51, 'developing',
    array['Clear spatial organisation (window, table, wall, corner)','Personal, genuine final reflection'], array['Missing plural forms (''book'', ''poster'', ''paper'')','Missing article before ''colour'''], 'The description uses clear spatial organisation to guide the reader around the room, but frequent missing plural forms keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'The room is described with relevant sensory and spatial detail.', 'I like this because I can see the sky when I wake up.', array['Personal detail connects description to feeling'], array['Add a sound or smell detail for richer description']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Uses spatial organisation appropriate to descriptive writing.', null, array['Clear ''tour'' structure around the room'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Spatial linkers (Next to, In the corner) organise the description clearly.', 'In the corner, there is my desk', array['Clear spatial progression through the room'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate descriptive vocabulary.', null, array['Correct use of ''messy'', ''quiet'''], array['Try ''cluttered'' as a more precise alternative to ''messy''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with plural forms.', 'there is a small table with my lamp and some book', array[]::text[], array['Review plural nouns after ''some'' and ''many'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 30, 'with my lamp and some book', 'mistake', 'singular_plural', '''Book'' should be plural after ''some'': ''some books''.', null, 'with my lamp and some books'),
    (0, 30, 'I have many poster on the wall', 'mistake', 'singular_plural', '''Poster'' should be plural after ''many'': ''many posters''.', 'Countable nouns take ''-s'' after ''many''.', 'I have many posters on the wall')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'descriptive_writing', 'C1', 'The Abandoned Lighthouse — Strong C1 Response', 'The lighthouse stands at the very edge of the headland, its once-brilliant white paint now weathered to a mottled grey that seems to mirror the sky pressing down upon it. Waves crash rhythmically against the rocks below, sending fine sprays of salt-laced mist drifting up towards the structure, where it settles on the rusted iron railings in a fine, glistening film.

Inside, the air carries the distinct, damp smell of long abandonment — a mixture of salt, rust and something faintly organic, as though the sea itself has slowly begun reclaiming the building from within. Sunlight filters through a cracked window in the keeper''s old quarters, illuminating dust motes that drift lazily through the still air, undisturbed for what must be years.

The spiral staircase, its wrought-iron steps groaning underfoot, winds upward past peeling walls where faded photographs still cling stubbornly to their frames — a keeper''s family, frozen mid-smile, indifferent to the decades that have passed since the shutter clicked. At the top, the lamp room offers an unobstructed view of the churning grey sea beyond, the very expanse this light once existed to warn ships away from.

There is something quietly haunting about a structure built entirely for guidance now standing dark and silent, its purpose rendered obsolete by satellite navigation, yet somehow still commanding the same quiet authority over the coastline it has watched for over a century.',
    95, 'advanced',
    array['Exceptionally rich, precise sensory detail across sight, smell, sound and touch','Sophisticated use of figurative language without becoming overwrought','Thematically coherent closing reflection tying description to meaning'], array[]::text[], 'An outstanding descriptive response: sensory detail is layered across multiple senses with genuine precision, and the closing paragraph elevates the piece from mere description into something thematically resonant.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 19, 'The description is exceptionally rich and layered, engaging multiple senses with genuine precision.', 'the distinct, damp smell of long abandonment — a mixture of salt, rust and something faintly organic', array['Multi-sensory detail woven together naturally, not as a checklist'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful command of descriptive technique, including figurative language used with genuine control.', null, array['Personification (''the sea itself has slowly begun reclaiming'') used precisely, not excessively'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 19, 'Excellent spatial and thematic organisation, moving from exterior to interior to reflective conclusion.', 'There is something quietly haunting about a structure built entirely for guidance now standing dark and silent', array['Elegant final paragraph elevates description into genuine meaning'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, evocative vocabulary used with complete control throughout.', null, array['''mottled grey'', ''wrought-iron steps groaning'' show genuine descriptive precision'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex, controlled sentence structures used with confidence throughout.', null, array['Confident use of long, layered descriptive sentences balanced with rhythm'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'blog_post', 'B1', '5 Tips for Staying Motivated to Study — Developing B1 Response', 'HOW I STAY MOTIVATED TO STUDY (5 TIPS THAT WORK FOR ME!)

Hi everyone! Today I want to share some tips that help me stay motivated when I study for exam. I hope it help you too!

1. Make a study plan. I write what I need to study every day, this help me dont feel overwhelm.

2. Take break. I study 25 minute then I take 5 minute break. This method help my brain to rest.

3. Study with friend. Sometimes is more fun to study with someone, we can explain things to each other.

4. Reward yourself. After I finish my study plan, I watch one episode of my favourite show. This motivate me to finish fast!

5. Sleep enough. I try to sleep 8 hour every night because when I am tired, I cannot concentrate good.

That is all my tips! I hope it useful for you. Good luck with your study!',
    50, 'developing',
    array['Engaging, personal blog voice with direct reader address','Clear numbered list structure, appropriate for the genre'], array['Missing ''-s'' on plural nouns throughout (''minute'', ''hour'')','Missing ''to be'' in several places'], 'The blog post has a genuinely engaging, personal voice appropriate to the genre, but frequent missing plurals and ''to be'' omissions keep it at a developing level.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 10, 'Five relevant, practical tips are given with brief personal justification for each.', 'I study 25 minute then I take 5 minute break.', array['Practical, specific tips rather than vague advice'], array['Add a personal anecdote about when a tip helped']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Uses an engaging blog format with a catchy title, direct address and a numbered list.', 'Hi everyone! Today I want to share some tips', array['Direct, friendly address to readers throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Clear numbered structure makes the post easy to follow.', null, array['Each tip is clearly separated and numbered'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for the topic.', null, array['Correct use of ''motivated'', ''overwhelmed'''], array['Try ''recharge'' as an alternative to ''rest''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with plural forms and missing ''to be''.', 'I study 25 minute then I take 5 minute break', array[]::text[], array['Review plural forms after numbers (''25 minutes'', ''5-minute break'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e6_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e6, (values
    (0, 30, 'I study 25 minute then I take 5 minute break', 'mistake', 'singular_plural', '''Minute'' needs a plural ''-s'' after the number 25.', null, 'I study for 25 minutes then I take a 5-minute break'),
    (0, 25, 'this help me dont feel overwhelm', 'mistake', 'word_form', '''Overwhelm'' is a verb; the adjective form ''overwhelmed'' is needed here.', null, 'this helps me not feel overwhelmed')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e7 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'blog_post', 'B2', 'Why I Stopped Using Social Media for a Month — Meets Expectations B2 Response', 'THE MONTH I QUIT SOCIAL MEDIA (AND WHAT I LEARNED)

A few months ago, I realised I was spending nearly three hours a day scrolling through social media without really enjoying much of it. So, slightly impulsively, I decided to delete the apps for a whole month and see what happened.

The first few days were honestly harder than I expected. I kept reaching for my phone out of pure habit, unlocking it and staring blankly at my home screen before remembering there was nothing to check anymore. It''s strange how automatic that behaviour had become without me even noticing.

By the second week, though, something shifted. I found myself reading more, actually finishing books instead of abandoning them halfway through. I also noticed I was more present during conversations with friends, rather than half-listening while thinking about what to post later.

That said, I won''t pretend it was all positive. I did miss keeping up with friends who live abroad, and I occasionally felt genuinely out of the loop with things happening in my wider social circle.

When the month ended, I didn''t reinstall everything. Instead, I''ve kept just one app, with notifications off, and set specific times to check it. It''s not a perfect system, but it feels a lot healthier than where I started.',
    83, 'meets_expectations',
    array['Genuinely honest, balanced account including both positives and negatives','Natural, conversational blog voice throughout','Specific personal detail makes the post feel authentic'], array['Could end with a direct question to encourage reader comments, a common blog convention'], 'This response meets B2 expectations with a natural, honest blog voice and a genuinely balanced account of the experience, avoiding an overly simplistic ''social media is bad'' conclusion.'
  )
  returning id
),
e7_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e7, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'The experience is described with genuine, balanced reflection rather than a simplistic conclusion.', 'I did miss keeping up with friends who live abroad, and I occasionally felt genuinely out of the loop', array['Honest acknowledgement of downsides avoids an oversimplified message'], array['End with a question to invite reader engagement']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Genuinely natural, personal blog voice throughout, well matched to the genre.', 'So, slightly impulsively, I decided to delete the apps', array['Natural conversational asides (''slightly impulsively'') suit the genre well'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear chronological organisation with natural time-based linkers.', 'By the second week, though, something shifted.', array['Clear progression through the month'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 16, 'Good range of natural, idiomatic vocabulary suited to the blog register.', null, array['''out of the loop'', ''out of pure habit'' show natural idiomatic use'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate throughout with a good range of structures.', null, array['Accurate, natural use of past continuous and present perfect'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;