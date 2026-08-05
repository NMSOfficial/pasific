-- Pasific Library batch 4: original examples for compare_contrast_essay and
-- formal_email, spanning B1-C1 across developing/meets/strong bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'compare_contrast_essay', 'B1', 'Beach Holiday vs. Mountain Holiday — Developing B1 Response', 'There is many type of holiday but two most popular is beach holiday and mountain holiday. This essay will compare this two type.

Beach holiday is very relaxing. You can swim in the sea, lay on the sand and enjoy the sun. Many family like beach because children can play in the water. But beach can be very crowded in summer and hotel is expensive.

Mountain holiday is different. You can walk in nature, breath fresh air and see beautiful view. It is more quiet than beach and good for people who like sport like hiking. But weather in mountain can change fast and it can be cold even in summer.

In conclusion, beach holiday is good for relax and family, mountain holiday is good for nature and sport. It depend what person like.',
    51, 'developing',
    array['Clear point-by-point comparison of both holiday types','Balanced conclusion acknowledging personal preference'], array['Frequent subject-verb agreement and plural errors','Spelling error (''breath'' for ''breathe'')'], 'The comparison covers relevant points for both holiday types, but frequent grammar errors (agreement, plurals) and a spelling confusion keep this at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'Both holiday types are compared with relevant points, though development stays basic.', 'Beach holiday is good for relax and family, mountain holiday is good for nature and sport.', array['Clear final comparison in the conclusion'], array['Add a specific example destination for each type']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows a point-by-point comparison structure appropriate for the level.', null, array['Balanced treatment of both options'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Clear paragraph for each holiday type, though transitions are basic.', 'Mountain holiday is different.', array['One holiday type per paragraph'], array['Use comparison linkers like ''similarly'' or ''in contrast''']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic and includes a spelling error (''breath'' instead of ''breathe'').', null, array['Correct use of ''relaxing'', ''crowded'''], array['Check spelling of ''breathe'' (verb) vs ''breath'' (noun)']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with plural nouns and subject-verb agreement.', 'There is many type of holiday', array[]::text[], array['Review ''there are'' with plural nouns','Review plural forms (''types'', ''hotels'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 30, 'There is many type of holiday', 'mistake', 'subject_verb_agreement', '''Types'' is plural, so ''there are'' is needed, not ''there is''.', null, 'There are many types of holiday'),
    (0, 20, 'breath fresh air', 'mistake', 'spelling', 'The verb is spelled ''breathe'' (with an ''e''); ''breath'' is the noun.', 'Verb: breathe /briːð/. Noun: breath /breθ/.', 'breathe fresh air')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'compare_contrast_essay', 'B2', 'Physical Books vs. E-books — Meets Expectations B2 Response', 'The way people read has changed considerably with the rise of e-books, yet physical books remain popular. This essay compares the two formats in terms of convenience, cost and reading experience.

In terms of convenience, e-books have a clear advantage. A single e-reader can store thousands of titles, making it ideal for travel, whereas carrying multiple physical books can be heavy and impractical. E-books can also be purchased and downloaded instantly, without needing to visit a shop.

Regarding cost, the comparison is less clear-cut. While e-books are often cheaper per title, the initial cost of an e-reader device can be significant. Physical books, on the other hand, can often be borrowed for free from libraries or bought second-hand at low prices.

Finally, in terms of reading experience, many readers report that physical books feel more satisfying, with the tactile sensation of turning pages and the absence of screen glare. However, e-books offer useful features such as adjustable font size and built-in dictionaries, which some readers find genuinely helpful.

In conclusion, while e-books offer clear advantages in convenience and functionality, physical books continue to offer a reading experience that many people are unwilling to give up entirely.',
    81, 'meets_expectations',
    array['Clear point-by-point comparison structure (convenience, cost, experience)','Balanced treatment without oversimplifying either side'], array['Could include a personal opinion or recommendation for different types of reader'], 'This response meets B2 expectations with a clear, consistent point-by-point structure and genuinely balanced comparison across three relevant criteria.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'Both formats are compared across three clear, relevant criteria.', 'This essay compares the two formats in terms of convenience, cost and reading experience.', array['Explicit criteria set out and followed consistently'], array['Add a recommendation for which reader type suits which format']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Well-organised point-by-point comparison structure, appropriate for the genre.', null, array['Consistent structure across all three points'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear paragraphing with appropriate comparison linkers.', 'Regarding cost, the comparison is less clear-cut.', array['Each paragraph opens with a clear topic marker'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of topic-specific vocabulary used accurately.', null, array['''tactile sensation'', ''clear-cut'' show precise word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate with a good range of structures.', null, array['Accurate use of contrast structures (''while... on the other hand'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'compare_contrast_essay', 'C1', 'Traditional Lecture vs. Project-Based Learning — Strong C1 Response', 'As educational institutions reconsider how best to prepare students for an increasingly complex world, two pedagogical approaches are frequently contrasted: the traditional lecture format and project-based learning. This essay examines their relative strengths and weaknesses across several dimensions.

In terms of content delivery, traditional lectures offer clear efficiency advantages: a single instructor can transmit substantial amounts of information to large groups in a structured, predictable format. Project-based learning, by contrast, sacrifices some efficiency in exchange for deeper engagement, as students construct understanding through hands-on investigation rather than passive reception.

With respect to skill development, the two approaches diverge considerably. Lectures tend to prioritise the acquisition of theoretical knowledge, whereas project-based learning cultivates practical competencies such as collaboration, problem-solving and self-directed research — skills increasingly valued in professional contexts. However, this comes at a potential cost: project-based learning can produce uneven coverage of foundational content if not carefully structured.

Finally, considering assessment, lectures pair naturally with standardised testing, offering straightforward comparability across students. Project-based learning, conversely, often requires more resource-intensive, individualised assessment methods, which some institutions may find impractical to scale.

In conclusion, rather than viewing these approaches as mutually exclusive, the evidence suggests that an effective curriculum would strategically combine the content efficiency of lectures with the deeper engagement fostered by project-based learning, tailored to the specific learning objectives at hand.',
    90, 'strong',
    array['Systematic, multi-dimensional comparison (content delivery, skills, assessment)','Sophisticated synthesis rather than a simple verdict','Precise, wide-ranging academic vocabulary'], array['A specific study or institution example would strengthen the argument further'], 'A strong C1 response because the comparison is organised around consistent, explicit dimensions and concludes with a genuinely synthesised recommendation rather than simply favouring one approach.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'The comparison is systematic and reaches a sophisticated, synthesised conclusion.', 'an effective curriculum would strategically combine the content efficiency of lectures with the deeper engagement fostered by project-based learning', array['Avoids a simplistic either/or verdict'], array['Cite a specific study or institution as a concrete example']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the sophisticated register expected of a C1 compare-contrast essay.', null, array['Explicit, consistent dimensions of comparison used throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent cohesion with sophisticated, varied comparison linkers.', 'With respect to skill development, the two approaches diverge considerably.', array['Each paragraph opens with a clearly signposted point of comparison'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide range of precise, topic-specific academic vocabulary.', null, array['''pedagogical approaches'', ''resource-intensive'' show sophisticated word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammar handled with confidence and accuracy throughout.', null, array['Effective use of parallel structure across the comparison'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'formal_email', 'B1', 'Asking About Room Availability — Developing B1 Response', 'Dear Sir or Madam,

I am writing for ask about room in your hotel. I want to book a room for 3 night, from 10 August to 13 August, for two person.

Can you tell me if you have room available for this date? I also want to know the price and if breakfast is include.

I hope you can answer me soon because I need to plan my trip.

Thank you for you time.

Yours faithfully,
Elif Kaya',
    49, 'developing',
    array['Correct formal opening and closing (Dear Sir or Madam / Yours faithfully)','Clear, specific request with relevant details (dates, number of guests)'], array['Missing ''-ing'' after preposition ''for''','Frequent article and plural errors','Possessive error (''you time'' instead of ''your time'')'], 'The email includes the correct formal greeting, closing and a clear, specific request, but frequent grammar errors (gerunds after prepositions, plurals, possessives) keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 10, 'The request is clear with relevant specific details (dates, number of guests, price and breakfast questions).', 'Can you tell me if you have room available for this date?', array['Specific, answerable questions included'], array['Mention any specific room type preference']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Correct formal email conventions: appropriate opening, closing and register throughout.', 'Dear Sir or Madam, ... Yours faithfully,', array['Correct formal greeting matched to ''Yours faithfully'' closing'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Ideas are organised into short, clear paragraphs appropriate to email format.', null, array['Each paragraph has one clear purpose'], array['Add a linking phrase between the two requests']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for a hotel booking enquiry.', null, array['Correct use of ''available'', ''breakfast is included'''], array['Try ''accommodation'' as an alternative to ''room''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with gerunds after prepositions, plurals and possessives.', 'I am writing for ask about room', array[]::text[], array['Review gerund forms after prepositions (''for asking'', not ''for ask'')','Review possessive adjective ''your'' vs subject pronoun ''you'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 30, 'I am writing for ask about room', 'mistake', 'verb_tense', 'After a preposition like ''for'', the verb needs the ''-ing'' form: ''for asking''.', 'Prepositions are followed by a gerund (-ing form), not the base verb.', 'I am writing to ask about a room'),
    (0, 20, 'Thank you for you time', 'mistake', 'pronouns', 'The possessive adjective ''your'' is needed before ''time'', not the subject/object pronoun ''you''.', null, 'Thank you for your time')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'formal_email', 'B2', 'Requesting Internship Information — Strong B2 Response', 'Dear Ms. Harrington,

I am writing to enquire about the summer internship programme advertised on your company''s website. I am currently a second-year business student at the University of Leeds, and I am very interested in gaining practical experience in marketing.

I would be grateful if you could provide some further details about the programme, particularly regarding its duration, the application deadline, and whether any prior work experience is required. I would also appreciate knowing whether the internship is paid and if it is possible to complete it remotely.

I have attached my CV for your reference, which outlines my academic background and relevant coursework in digital marketing. I believe this experience, combined with my strong interest in your company''s work, would make me a suitable candidate for the programme.

I look forward to hearing from you and would be happy to provide any further information if required.

Yours sincerely,
Deniz Aydın',
    87, 'strong',
    array['Fully appropriate formal register throughout','Clear, well-organised list of specific questions','Correct email conventions including CV reference and appropriate sign-off'], array['Could specify a preferred start date for added clarity'], 'A strong B2 response: the register is consistently formal and polite, the request is specific and well-organised, and the email follows correct conventions from opening to closing throughout.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'The request is specific, well-organised and includes all relevant supporting information.', 'particularly regarding its duration, the application deadline, and whether any prior work experience is required', array['Multiple specific, clearly organised questions'], array['Mention a preferred start date']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves formal email conventions with consistent, polite register throughout.', 'Dear Ms. Harrington, ... Yours sincerely,', array['Named recipient matched correctly with ''Yours sincerely'''], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 17, 'Clear paragraph structure with each paragraph serving a distinct purpose.', null, array['Logical flow from introduction to request to closing'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of appropriately formal vocabulary used accurately.', null, array['''I would be grateful if'', ''for your reference'' show natural formal phrasing'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Consistently accurate grammar throughout, including polite request structures.', null, array['Accurate use of conditional politeness structures (''I would be grateful if you could'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'formal_email', 'C1', 'Requesting a Letter of Recommendation — Strong C1 Response', 'Dear Professor Whitfield,

I hope this email finds you well. I am writing to ask whether you would be willing to provide a letter of recommendation in support of my application to the Master''s programme in Environmental Policy at Sciences Po, for which the application deadline is 15 January.

Having completed your Environmental Economics module last year, during which I received a distinction and contributed regularly to seminar discussions, I hope you might feel able to speak to both my academic ability and my genuine engagement with the subject. I have attached my personal statement and academic transcript, which I hope will be useful in providing context for the recommendation.

I am, of course, happy to arrange a brief call or meeting at your convenience to discuss the application further, should that be helpful. I fully appreciate that this request comes with relatively short notice, and I would be sincerely grateful for any assistance you are able to offer within the available timeframe.

Thank you very much for considering this request, and please do let me know if you require any further information.

Yours sincerely,
Canan Öztürk',
    93, 'strong',
    array['Sophisticated, appropriately deferential register throughout','Specific supporting detail (module, grade, deadline) that strengthens the request','Graceful acknowledgement of the short-notice imposition'], array[]::text[], 'A strong C1 response: the register is precisely calibrated for a request to a professor — respectful without being obsequious — and the specific supporting details make the request easy to act on.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'The request is specific, well-supported and anticipates the recipient''s practical needs.', 'Having completed your Environmental Economics module last year, during which I received a distinction', array['Provides exactly the context a recommender would need'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the precisely calibrated register expected of a formal academic request.', null, array['Graceful acknowledgement of short notice shows genuine register control'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent organisation moving logically from request to justification to practical offer.', 'I am, of course, happy to arrange a brief call or meeting at your convenience', array['Natural progression from request to supporting evidence to accommodation'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Sophisticated, precisely calibrated formal vocabulary used with confidence.', null, array['''sincerely grateful'', ''within the available timeframe'' show natural, polished register'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Consistently accurate, complex grammar throughout.', null, array['Confident use of participle clause opening (''Having completed...'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;