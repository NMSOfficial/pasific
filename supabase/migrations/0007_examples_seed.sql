-- Seed content for the student Example Library, ported from
-- src/mock/examples.ts. topic_id is left null since these reference mock
-- catalog topic ids that don't exist as real catalog_topics rows.

with e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'for_and_against_essay', 'B2', 'Social Media and Teenagers — Strong B2 Response',
    'Nowadays, almost every teenager uses social media every day. While some people think this brings mainly negative effects, others believe it also has real benefits. This essay will look at both sides before giving my own opinion.

On the one hand, social media can have harmful effects on teenagers. Many young people compare their lives to the carefully chosen photos they see online, which can lower their self-esteem. In addition, spending too much time scrolling can reduce the time available for sleep, homework and face-to-face friendships.

On the other hand, social media also offers clear advantages. It allows teenagers to stay in contact with friends and family who live far away, and it can be a useful tool for learning, since many students follow educational accounts. Moreover, it gives young people a space to express their creativity and find communities who share their interests.

In my opinion, social media itself is neither good nor bad; it depends on how it is used. If teenagers are taught to manage their time and use it responsibly, the benefits can outweigh the risks. Therefore, schools and parents should focus on guiding safe use rather than banning it completely.',
    84, 'strong',
    array['Balanced structure', 'Clear personal opinion in conclusion', 'Good range of linking devices'],
    array['Some repetition of vocabulary', 'Conclusion could reference a specific earlier point'],
    'This response earns a strong score because it is balanced, well organised, and ends with a genuine, supported opinion rather than a generic summary.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'Both sides are addressed with a clear, well-supported personal opinion.', 'In my opinion, social media itself is neither good nor bad; it depends on how it is used.', array['Balanced treatment of both views', 'Clear final position'], array['Could add one more specific example to strengthen the argument']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Matches the for-and-against essay genre well, with an appropriately neutral tone before the opinion.', null, array['Neutral register maintained in the body'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Paragraphing is clear and linking devices are used accurately.', 'On the other hand, social media also offers clear advantages.', array['Clear paragraph functions', 'Effective contrast linkers'], array['The conclusion could refer back to a specific point from the body']),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Good range of topic vocabulary with only minor repetition.', null, array['Natural collocations such as "lower their self-esteem"'], array['"clear advantages" and "clear opinion" repeated — try a synonym']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Grammar is mostly accurate with a good range of sentence structures.', null, array['Accurate use of conditionals in the final paragraph'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint)
  select id, 0, 0, 'Nowadays, almost every teenager uses social media every day.', 'info', 'repetition',
    '"Social media" and related words are repeated often; this is acceptable here but watch for overuse across the whole essay.',
    'Consider a synonym like "these platforms" in later sentences.'
  from e1
),

e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'C1', 'Reducing Plastic Pollution — Advanced C1 Response',
    'Plastic pollution has become one of the most pressing environmental challenges of our time, with single-use packaging accumulating in oceans and landfills at an alarming rate. This essay examines the root causes of the problem and proposes several practical solutions.

The primary cause of plastic pollution is the convenience-driven culture of disposability that characterises modern consumption. Manufacturers favour cheap, lightweight plastic packaging because it reduces production costs, while consumers rarely consider the long-term environmental cost of a product they use for mere minutes. Furthermore, waste management infrastructure in many countries has failed to keep pace with the sheer volume of plastic being produced, meaning that a significant proportion never reaches proper recycling facilities.

Addressing this problem requires action at multiple levels. Governments could introduce stricter regulations, such as taxing single-use plastics or mandating minimum recycled content in packaging, as several European countries have already done with measurable success. At the same time, businesses should be encouraged, through incentives or public pressure, to redesign packaging using biodegradable alternatives. Finally, individuals can contribute meaningfully by reducing unnecessary consumption and supporting brands that prioritise sustainability.

In conclusion, while the scale of plastic pollution can seem overwhelming, a combination of regulatory, corporate and individual action offers a realistic path towards meaningful reduction.',
    91, 'advanced',
    array['Precise academic vocabulary', 'Well-developed, specific solutions', 'Strong cohesion throughout'],
    array['One overly long sentence reduces clarity slightly'],
    'A high-scoring response at C1 because it moves beyond generic statements to specific, well-reasoned causes and solutions, using precise academic vocabulary throughout.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 19, 'Causes and solutions are both explored in depth with specific, realistic detail.', null, array['Concrete real-world reference to European regulation'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Clear problem-solution structure appropriate to a C1-level analytical essay.', null, array['Distinct cause and solution sections'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Sophisticated cohesive devices link ideas smoothly across paragraphs.', 'At the same time, businesses should be encouraged...', array['Varied, natural-sounding linking phrases'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Precise, topic-specific academic vocabulary used with confidence.', null, array['"convenience-driven culture of disposability" shows precise, idiomatic phrasing'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Complex sentence structures are handled accurately with only minor lapses.', null, array['Confident use of participle clauses'], array['One long sentence in paragraph two could be split for clarity'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),

e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'compare_contrast_essay', 'B1', 'City vs. Countryside — Developing B1 Response',
    'Many people is living in big cities today but some peoples prefer the countryside. In this essay I will compare the two place.

In the city, there is a lot of things to do. There are cinemas, shops and restaurant. Also you can find a job easy because there is many company. But the city is very noisy and the traffic is bad every day.

In the countryside, the life is more quiet. The air is more clean and you can see nature. People know they neighbours better. But there is less shop and less job opportunity, so some young people is moving to city.

In conclusion, I think city is better for young people because of jobs, but countryside is better for family who want quiet life. It depend of what you want from life.',
    58, 'developing',
    array['A clear personal conclusion is given', 'Ideas are understandable despite errors'],
    array['Frequent subject–verb agreement errors', 'Limited vocabulary range', 'General statements instead of specific examples'],
    'This response is understandable and attempts a full comparison, but frequent grammar errors and general vocabulary keep it at a developing B1 level. The next step is targeted work on subject–verb agreement.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 12, 'Both settings are addressed but the comparison stays at a general level.', null, array['A personal conclusion is offered'], array['Add specific reasons or examples rather than general statements']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'The structure loosely follows a comparison essay but paragraph focus drifts.', null, array[]::text[], array['Keep each paragraph focused on one clear point of comparison']),
    ('crit_organisation_cohesion', 'organisation_cohesion', 12, 'Basic linking words are used but transitions between ideas are abrupt.', 'But the city is very noisy and the traffic is bad every day.', array['Clear paragraph for each location'], array['Use a wider range of contrast linkers than just "but"']),
    ('crit_vocabulary_range', 'vocabulary_range', 12, 'Vocabulary is basic and appropriate for everyday topics but limited in range.', null, array['Everyday vocabulary used correctly overall'], array['"a lot of things", "many company" could be replaced with more precise words']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 11, 'Frequent errors in subject-verb agreement and plural forms affect accuracy.', 'Many people is living in big cities today but some peoples prefer the countryside.', array[]::text[], array['Review subject–verb agreement, especially with "people"', 'Review singular/plural noun forms'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e3_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.suggested_correction
  from e3, (values
    (0, 60, 'Many people is living in big cities today but some peoples prefer the countryside.', 'mistake', 'subject_verb_agreement', '"People" is already plural, so it takes "are", not "is", and does not take an "-s".', 'Many people are living in big cities today but some people prefer the countryside.'),
    (0, 40, 'there is a lot of things to do', 'inaccuracy', 'subject_verb_agreement', '"Things" is plural, so the verb should agree: "there are a lot of things".', 'there are a lot of things to do')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, suggested_correction)
)
select 1;
