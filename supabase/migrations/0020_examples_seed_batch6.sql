-- Pasific Library batch 6: original examples for application_letter and
-- article, spanning B1-C1 across developing/meets/strong/advanced bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'application_letter', 'B1', 'Applying for a Part-Time Job at a Café — Developing B1 Response', 'Dear Mr. Collins,

I am writing because I want to apply for the part-time job in your café. I saw the advertisement on your window last week.

I am 17 year old and I am student at Riverside High School. I dont have work experience before, but I am very hard-working and I learn fast. I also like talking with people, so I think I will be good for this job.

I am free to work on weekend and also some evening after school. I can start immediately if you want.

I hope you will consider my application. I am available for interview anytime.

Yours sincerely,
Tomasz Nowak',
    49, 'developing',
    array['Clear statement of purpose and relevant personal qualities','Includes availability, which is genuinely useful information for the employer'], array['Missing plural ''-s'' (''17 year old'')','Missing article before ''student'''], 'The letter states a clear purpose and includes useful practical information, but missing articles and plural forms keep it at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 10, 'The application purpose is clear and includes relevant personal qualities and availability.', 'I am free to work on weekend and also some evening after school.', array['Practical, relevant availability information included'], array['Give a specific example of hard work or customer service']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Correct formal letter structure with appropriate opening and closing.', 'Dear Mr. Collins, ... Yours sincerely,', array['Correct formal greeting matched to closing'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Clear paragraph structure moving from purpose to qualities to availability.', null, array['Logical order of information'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for a job application.', null, array['Correct use of ''hard-working'', ''available'''], array['Try ''punctual'' or ''reliable'' as further relevant qualities']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with plurals and articles.', 'I am 17 year old and I am student', array[]::text[], array['Review plural forms after numbers (''17 years old'')','Review articles before singular countable nouns (''a student'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 25, 'I am 17 year old', 'mistake', 'singular_plural', '''Year'' needs a plural ''-s'' after the number 17.', null, 'I am 17 years old'),
    (0, 20, 'I am student at Riverside High School', 'mistake', 'articles', 'The singular countable noun ''student'' needs the article ''a'' before it.', 'Singular countable nouns almost always need ''a'', ''an'' or ''the''.', 'I am a student at Riverside High School')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'application_letter', 'B2', 'Applying for a University Scholarship — Meets Expectations B2 Response', 'Dear Scholarship Committee,

I am writing to apply for the Global Futures Scholarship, as advertised on your university''s website, for the upcoming academic year.

I am currently completing my final year of secondary education, where I have consistently ranked among the top students in my class, particularly in mathematics and economics. Beyond academics, I have been actively involved in my school''s debate society for three years, serving as team captain in my final year, which has strengthened both my analytical thinking and my public speaking skills.

I am applying for this scholarship because studying at your university would allow me to pursue my long-standing interest in economics in an environment known for its strong research culture. However, without financial support, attending would not be possible for my family, which is why this opportunity means a great deal to me.

I have enclosed my academic transcript, two letters of recommendation, and a personal statement, as requested in the application guidelines. I would be delighted to provide any further information should it be needed.

Thank you for considering my application.

Yours faithfully,
Amara Okafor',
    80, 'meets_expectations',
    array['Specific, relevant achievements presented with clear evidence','Honest, genuine explanation of financial need without being overly emotional','Correct formal structure throughout'], array['Could connect the university''s specific programme features more explicitly to personal goals'], 'This response meets B2 expectations with specific, well-chosen achievements and a genuine, appropriately measured explanation of need, though a more specific connection to the university''s programme would strengthen it further.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'Relevant achievements and a genuine motivation are both clearly presented.', 'serving as team captain in my final year, which has strengthened both my analytical thinking and my public speaking skills', array['Specific, credible achievement with a clear skill link'], array['Reference a specific feature of the university''s economics programme']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Correct formal application letter structure and register throughout.', null, array['Appropriate balance of confidence and humility'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear organisation moving from achievements to motivation to practical details.', 'I am applying for this scholarship because studying at your university would allow me to pursue my long-standing interest', array['Logical, easy-to-follow structure'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of appropriately formal vocabulary used accurately.', null, array['''long-standing interest'', ''means a great deal to me'' show natural formal phrasing'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate throughout with a good range of structures.', null, array['Accurate use of present perfect for ongoing achievements'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'application_letter', 'C1', 'Applying for a Graduate Trainee Position — Strong C1 Response', 'Dear Ms. Alvarez,

I am writing to apply for the Graduate Trainee position within your Strategy division, as advertised on your careers portal, and to explain why I believe my background makes me a strong fit for the programme.

Having graduated with first-class honours in Economics from the University of Manchester, I developed a particular interest in strategic decision-making through a dissertation examining market entry strategies in emerging economies — an interest I subsequently pursued through a six-month internship at a boutique consultancy, where I contributed directly to two client engagements involving competitive analysis and pricing strategy.

Beyond the specific technical skills this experience has given me, I have come to value your organisation''s emphasis on rotational placements, which I believe would allow me to develop a genuinely cross-functional understanding of the business before specialising — something I consider essential for long-term strategic roles rather than narrow technical ones.

I have attached my CV and academic transcript for your review, and I would welcome the opportunity to discuss my application further at interview. I am available at your convenience and can adjust my schedule as needed.

Thank you for considering my application; I very much look forward to the possibility of contributing to your team.

Yours sincerely,
Lars Eriksson',
    91, 'strong',
    array['Highly specific, credible evidence directly tied to the role''s requirements','Genuine engagement with a specific feature of the programme (rotational placements)','Sophisticated, confident yet appropriately humble register'], array[]::text[], 'A strong C1 response: rather than generic claims of suitability, the writer offers specific, verifiable evidence and explicitly connects it to a named feature of the programme, demonstrating genuine research and reflection.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Highly specific, credible achievements are directly connected to the requirements of the role.', 'your organisation''s emphasis on rotational placements, which I believe would allow me to develop a genuinely cross-functional understanding', array['Specific engagement with a named programme feature rather than generic praise'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the sophisticated, confident-but-humble register expected at this level.', null, array['Confidence is well-calibrated, never veering into arrogance'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent organisation moving from qualification to specific experience to genuine motivation.', 'Beyond the specific technical skills this experience has given me, I have come to value...', array['Smooth, logical progression between paragraphs'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Precise, sophisticated professional vocabulary used with full control.', null, array['''cross-functional understanding'', ''boutique consultancy'' show genuine professional fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammar handled with confidence and near-total accuracy throughout.', null, array['Confident use of participle clauses and subordination'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'article', 'B1', 'My Favourite Hobby — Developing B1 Response', 'MY FAVOURITE HOBBY: PHOTOGRAPHY

Everyone have a hobby and mine is photography. I start this hobby two year ago when my father give me his old camera.

At the beginning, I dont know how to use the camera good, but I practice every weekend. Now I can take good photo of nature, animal and my friend. I like most take photo of sunset because the color is very beautiful.

Photography teach me to see the world different. Small thing that people dont notice, like a flower or a shadow, become interesting when you look through camera.

If you want start a new hobby, I really recommend photography. You dont need expensive camera, even phone camera is enough for begin!',
    50, 'developing',
    array['Engaging, personal topic appropriate for a magazine article','Ends with a direct recommendation to the reader, matching the genre'], array['Frequent subject-verb agreement errors','Missing plural forms after numbers'], 'The article has an engaging personal voice appropriate for the genre, but frequent subject-verb agreement and plural errors keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'A personal hobby is described with relevant detail and a direct recommendation to readers.', 'I really recommend photography.', array['Direct address to the reader, appropriate for an article'], array['Add a specific memorable photo example']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Uses a clear headline and a personal, engaging tone appropriate to a magazine article.', 'MY FAVOURITE HOBBY: PHOTOGRAPHY', array['Appropriate headline format'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Clear paragraph progression from start of hobby to present skill to recommendation.', null, array['Logical chronological structure'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for the topic.', null, array['Correct use of ''recommend'', ''practice'''], array['Try ''capture'' as an alternative to repeated ''take photo''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent subject-verb agreement and plural errors.', 'Everyone have a hobby', array[]::text[], array['Review ''everyone'' + singular verb (''has'')','Review plural forms after numbers (''two years'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 20, 'Everyone have a hobby', 'mistake', 'subject_verb_agreement', '''Everyone'' is treated as singular, so the verb needs ''-s'': ''has''.', null, 'Everyone has a hobby'),
    (0, 20, 'I start this hobby two year ago', 'mistake', 'singular_plural', '''Year'' needs a plural ''-s'' after the number ''two''.', null, 'I started this hobby two years ago')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'article', 'B2', 'The Rise of Street Food Culture — Meets Expectations B2 Response', 'FROM STREET CORNER TO CITY HIGHLIGHT: WHY STREET FOOD IS HAVING ITS MOMENT

Walk through almost any major city today and you''ll notice something: the queues aren''t outside fine-dining restaurants anymore — they''re at food trucks and market stalls.

Street food has always existed, of course, but what''s changed is how it''s perceived. Once seen purely as a cheap, quick option, it''s now celebrated for exactly what makes it special: bold flavours, cultural authenticity and, often, genuinely skilled cooking that doesn''t come with an inflated price tag.

Part of the appeal is variety. Within a single food market, you might find Korean fried chicken next to Lebanese wraps and Mexican tacos, all cooked by people who often learned these recipes from family rather than culinary school. That sense of authenticity is something diners increasingly crave in an age of identical restaurant chains.

Social media has clearly played a role too. A beautifully plated street food dish, photographed against colourful market stalls, tends to perform brilliantly online — which in turn draws in curious new customers.

Whatever the reasons, one thing seems clear: street food isn''t a passing trend. It''s reshaping how, and where, we choose to eat.',
    82, 'meets_expectations',
    array['Genuinely engaging magazine-style opening and voice','Good range of natural, vivid vocabulary','Clear structure building from observation to explanation to conclusion'], array['Could include a specific city or food market as a concrete example'], 'This response meets B2 expectations with a genuinely engaging, magazine-appropriate voice and vivid vocabulary. A specific named example would help it reach the strong band.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'The trend is explored with relevant, well-developed reasoning and an engaging angle.', 'the queues aren''t outside fine-dining restaurants anymore — they''re at food trucks and market stalls', array['Vivid, specific opening observation'], array['Name a specific city or food market']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Genuinely engaging magazine article voice with an appropriate headline and hook.', 'FROM STREET CORNER TO CITY HIGHLIGHT: WHY STREET FOOD IS HAVING ITS MOMENT', array['Catchy, genre-appropriate headline'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Well-organised with a clear build from observation to reasons to conclusion.', 'Social media has clearly played a role too.', array['Each paragraph adds a distinct reason'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 16, 'Vivid, natural vocabulary well suited to the magazine register.', null, array['''inflated price tag'', ''having its moment'' show natural idiomatic flair'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate with natural, varied sentence structures.', null, array['Effective use of dashes and short sentences for emphasis, appropriate to the genre'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'article', 'C1', 'The Quiet Return of Vinyl Records — Strong C1 Response', 'WHY VINYL WON''T DIE: THE UNLIKELY COMEBACK OF THE RECORD PLAYER

In an age of infinite, frictionless streaming, it seems almost perverse that an entire generation of listeners who''ve never known a world without Spotify are increasingly choosing to buy music the most inconvenient way possible: on vinyl.

And yet the numbers don''t lie. Vinyl sales have climbed steadily for over a decade, and crucially, this isn''t merely nostalgia among older listeners reliving their youth — a substantial share of buyers are under thirty, discovering the format for the first time rather than returning to it.

So what explains the appeal? Partly, it''s a rebellion against the ephemeral nature of streaming. A playlist is disposable, endlessly reshuffled and half-forgotten; a record, by contrast, demands a kind of deliberate attention — you choose an album, you commit to a side, you can''t skip to the next song without getting up. In a culture engineered for infinite distraction, that friction has, somewhat unexpectedly, become the point rather than the drawback.

There''s also something to be said for the ritual itself: the tactile pleasure of handling a record, the warmth (real or imagined) of analogue sound, the cover art rendered at a scale that actually rewards looking at it. None of this is strictly necessary to enjoy music, but then again, neither is any ritual — that''s rather the appeal.

Vinyl was never really about efficiency. Its resurgence suggests that, even now, plenty of listeners are happy to trade convenience for something that feels a little more like an experience.',
    95, 'advanced',
    array['Genuinely sophisticated cultural analysis with a distinctive, confident voice','Vivid, precise vocabulary used with complete natural control','Memorable, well-crafted closing line typical of quality magazine writing'], array[]::text[], 'An outstanding C1/C2-level response: it reads like genuinely publishable magazine writing, with a distinctive voice, sophisticated cultural analysis, and prose rhythm that goes well beyond mechanical correctness into real stylistic control.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 19, 'The trend is explored with genuine cultural insight and a distinctive analytical angle.', 'that friction has, somewhat unexpectedly, become the point rather than the drawback', array['Genuinely original insight rather than a generic explanation'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Reads as genuinely publishable magazine writing with a confident, distinctive voice.', 'WHY VINYL WON''T DIE: THE UNLIKELY COMEBACK OF THE RECORD PLAYER', array['Headline and closing line both show real stylistic craft'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 19, 'Sophisticated, natural cohesion with a memorable closing that ties the argument together.', 'Vinyl was never really about efficiency.', array['Elegant final paragraph that reframes the entire piece'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, vivid vocabulary used with complete stylistic control.', null, array['''ephemeral'', ''analogue sound'' rendered at a scale that rewards looking'' show genuine stylistic flair'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly controlled, varied grammar with confident stylistic choices throughout.', null, array['Confident, deliberate use of sentence fragments and dashes for rhetorical effect'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;