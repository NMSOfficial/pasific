-- Pasific Library batch 7: original examples for report and review,
-- spanning B1-C1 across developing/meets/strong bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'report', 'B1', 'Report on School Library Usage — Developing B1 Response', 'INTRODUCTION
The purpose of this report is to look at how student use the school library and give some suggestion for improve it.

FINDINGS
Most student go to library only for do homework or use computer. Not many student borrow book for read for pleasure. Some student say the library is too quiet and boring, other say they dont have time.

The opening hour is also a problem. Library close at 4pm but many student have club activity until 5pm, so they cannot visit after school.

RECOMMENDATIONS
I recommend the library open later, maybe until 6pm. Also, library can organise event like book club to make reading more fun for student.

CONCLUSION
If school do these change, more student will use library for reading, not only for homework.',
    51, 'developing',
    array['Correct report structure with clear headings','Findings are supported with reasons given by students'], array['Missing plural ''-s'' on ''student'' throughout','Missing article before ''school library'' issue and elsewhere'], 'The report correctly uses headings and separates findings from recommendations, but the missing plural ''-s'' on ''student'' throughout is a frequent, repeated error that keeps this at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'Findings and recommendations are both included and are logically connected.', 'I recommend the library open later, maybe until 6pm.', array['Recommendation directly addresses the finding about opening hours'], array['Add specific numbers or a survey result to support the findings']),
    ('crit_genre_achievement', 'genre_achievement', 12, 'Correct use of report headings (Introduction, Findings, Recommendations, Conclusion).', 'INTRODUCTION ... FINDINGS ... RECOMMENDATIONS', array['Clear, appropriate use of headings throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Each section is clearly separated and focused on one topic.', null, array['Logical order from findings to recommendations to conclusion'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for a report.', null, array['Correct use of ''recommend'', ''opening hour'''], array['Try ''pupils'' as an alternative to repeated ''student''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent, repeated errors with the plural form of ''student''.', 'Most student go to library only for do homework', array[]::text[], array['Review plural nouns, especially ''students''','Review gerund forms after ''for'' (''for doing homework'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 30, 'Most student go to library only for do homework', 'mistake', 'singular_plural', '''Student'' should be plural (''students'') since it refers to students in general.', null, 'Most students go to the library only to do homework'),
    (0, 40, 'Not many student borrow book for read for pleasure', 'mistake', 'singular_plural', 'Both ''student'' and ''book'' should be plural here, and ''for read'' should be ''to read''.', null, 'Not many students borrow books to read for pleasure')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'report', 'B2', 'Report on Customer Service Standards — Meets Expectations B2 Response', 'INTRODUCTION
The purpose of this report is to evaluate the current standard of customer service at our downtown branch and to recommend possible improvements based on recent customer feedback.

FINDINGS
Overall, customer satisfaction remains reasonably high, with 78% of respondents rating their experience as ''good'' or ''excellent'' in the most recent survey. However, several recurring issues were identified. Firstly, average waiting times during peak hours (12pm–2pm) were reported as excessive by nearly a third of respondents. Secondly, a number of customers noted inconsistency in how staff handled complaints, with some describing helpful, empathetic responses and others reporting a more dismissive attitude.

Staff interviews suggested that inconsistency may partly stem from insufficient training on complaint-handling procedures, particularly among newer employees.

RECOMMENDATIONS
It is recommended that additional staff be scheduled during peak hours to reduce waiting times. In addition, a standardised complaint-handling training module should be introduced for all new staff during their induction period.

CONCLUSION
While overall satisfaction levels are encouraging, addressing waiting times and staff consistency would likely improve the customer experience further.',
    83, 'meets_expectations',
    array['Specific data used to support findings (percentages, time periods)','Recommendations directly and logically address each finding','Appropriately objective, formal report register throughout'], array['Could include a brief methodology note (how the survey was conducted)'], 'This response meets B2 expectations well, using specific data to support findings and offering recommendations that clearly correspond to the issues identified — a genuinely professional report structure.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'Findings are well supported with specific data and recommendations directly address them.', '78% of respondents rating their experience as ''good'' or ''excellent''', array['Specific statistics make the findings credible'], array['Briefly mention the survey methodology']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Correct, professional report structure and objective register throughout.', null, array['Consistently objective, data-led tone appropriate to the genre'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear section headings with logical progression from findings to cause to recommendation.', 'Staff interviews suggested that inconsistency may partly stem from insufficient training', array['Cause-analysis paragraph bridges findings and recommendations effectively'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 16, 'Good range of precise, formal report vocabulary.', null, array['''recurring issues'', ''induction period'' show accurate professional register'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Grammar is accurate throughout, including passive constructions typical of reports.', null, array['Accurate, natural use of passive voice (''it is recommended that'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'report', 'C1', 'Feasibility Report: Four-Day Working Week — Strong C1 Response', 'INTRODUCTION
This report examines the feasibility of introducing a four-day working week within the Operations department, evaluating the potential benefits and risks before offering a recommendation to senior management.

FINDINGS
Employee surveys indicate strong interest in the proposal, with 84% of respondents expressing support, citing improved work-life balance and reduced burnout as primary motivations. Comparable pilot schemes at similar-sized organisations have generally reported maintained or even improved productivity, attributed to more focused working patterns and reduced absenteeism.

However, several risks warrant careful consideration. Client-facing teams raised concerns about maintaining adequate coverage across a five-day service window, particularly given existing staffing constraints. Additionally, the transition would likely require a redesign of certain workflows currently structured around a five-day cadence, incurring some short-term implementation cost.

RECOMMENDATIONS
It is recommended that a six-month pilot be conducted within a single team before any organisation-wide rollout, with clearly defined productivity and client-satisfaction metrics established in advance to evaluate its success. Client-facing coverage should be addressed through staggered scheduling rather than a uniform day off for all staff.

CONCLUSION
While the proposal carries genuine implementation risk, the strength of employee support and encouraging evidence from comparable organisations suggest that a carefully structured pilot is a worthwhile next step.',
    93, 'strong',
    array['Sophisticated balance of supporting evidence and genuine risk analysis','Specific, actionable recommendation (pilot with defined metrics) rather than a vague suggestion','Precise, professional register throughout'], array[]::text[], 'A strong C1 response: rather than simply advocating for the proposal, it presents genuine risks alongside the benefits and proposes a specific, measured path forward (a metrics-based pilot) — exactly the kind of report a manager could act on.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Findings and risks are both explored with genuine depth, leading to a specific, actionable recommendation.', 'a six-month pilot be conducted within a single team... with clearly defined productivity and client-satisfaction metrics established in advance', array['Recommendation is specific and immediately actionable'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the professional, evidence-based register expected of a C1 feasibility report.', null, array['Genuinely balanced treatment of benefits and risks, as a real feasibility report requires'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent organisation with clear headings and logical progression throughout.', 'However, several risks warrant careful consideration.', array['Clean, professional shift from benefits to risks'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Precise, professional vocabulary used with confidence throughout.', null, array['''staggered scheduling'', ''five-day cadence'' show genuine professional fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammar handled with confidence and accuracy throughout.', null, array['Confident use of passive constructions typical of professional reports'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'review', 'B1', 'Review of a Local Restaurant — Developing B1 Response', 'Last weekend I go to a new restaurant call Bella Vista with my family. I want to share my opinion about this place.

The restaurant is very nice inside, with comfortable chair and nice music. The staff was friendly and they help us choose the food because it was our first time.

We order pizza and pasta. The pizza was delicious, with fresh tomato and good cheese. But the pasta was a little cold when it arrive, which was disappointing.

The price is not too expensive for the quality of food. For two people, we pay about 40 euro include drink.

In conclusion, I recommend this restaurant, especially for pizza. Maybe next time I will not order pasta.',
    50, 'developing',
    array['Clear, balanced opinion including both positive and negative points','Includes useful practical detail (price) for readers'], array['Frequent past tense errors (''I go'' instead of ''I went'')','Missing plural on ''euro'''], 'The review gives a balanced, genuinely useful opinion with practical detail, but frequent past tense errors keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'A clear, balanced opinion is given with a specific recommendation.', 'In conclusion, I recommend this restaurant, especially for pizza.', array['Balanced view including both a positive and a negative point'], array['Describe the atmosphere in a bit more detail']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows the review structure well, covering food, service, price and recommendation.', null, array['Covers all the key elements expected in a restaurant review'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Clear paragraph for each aspect (atmosphere, food, price, conclusion).', null, array['One clear topic per paragraph'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for a restaurant review.', null, array['Correct use of ''delicious'', ''disappointing'''], array['Try ''atmosphere'' instead of ''inside''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent past tense errors throughout.', 'Last weekend I go to a new restaurant', array[]::text[], array['Review past simple forms with time markers like ''last weekend'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 35, 'Last weekend I go to a new restaurant', 'mistake', 'verb_tense', '''Last weekend'' signals the past simple, so ''went'' is needed, not the base form ''go''.', null, 'Last weekend I went to a new restaurant'),
    (0, 30, 'the pasta was a little cold when it arrive', 'mistake', 'verb_tense', '''Arrive'' should be in the past simple to match the rest of the sentence: ''arrived''.', null, 'the pasta was a little cold when it arrived')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'review', 'B2', 'Review of "The Last Light" — Meets Expectations B2 Response', 'THE LAST LIGHT: A QUIET BUT POWERFUL DEBUT NOVEL

"The Last Light", the debut novel from author Marina Cole, tells the story of a small fishing village slowly grappling with the closure of its only industry. It''s not a plot-driven book, and readers expecting fast-paced drama may initially find the pacing frustrating.

What the novel lacks in plot momentum, however, it more than makes up for in characterisation. Cole has a genuine talent for capturing the small, quiet details of ordinary lives — a shared cup of tea, an awkward silence at a family dinner — that gradually build into something genuinely moving by the final chapters.

The prose style is understated, almost sparse at times, which suits the novel''s melancholic tone well, though a few sections in the middle feel slightly repetitive, revisiting similar emotional beats without adding much new.

Overall, this is a novel that rewards patience. It won''t appeal to everyone, particularly readers who prefer a strong plot, but for those willing to slow down, it offers a genuinely affecting portrait of a community in transition.

Rating: 4 out of 5 stars.',
    84, 'meets_expectations',
    array['Balanced, genuinely critical evaluation rather than pure praise','Specific textual detail used as evidence (the tea, the family dinner)','Clear guidance for readers on who would and wouldn''t enjoy the book'], array['Could quote a specific line to illustrate the prose style'], 'This response meets B2 expectations with a genuinely critical, balanced review that acknowledges the book''s weaknesses alongside its strengths, and gives readers clear, useful guidance.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'A genuinely balanced evaluation is given with clear guidance for potential readers.', 'It won''t appeal to everyone, particularly readers who prefer a strong plot, but for those willing to slow down', array['Clear reader guidance rather than a generic verdict'], array['Quote a specific line to illustrate the prose style']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Genuinely critical review register with a rating, well matched to the genre.', 'Rating: 4 out of 5 stars.', array['Balances praise and criticism authentically'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Well-organised, moving from plot to characterisation to style to verdict.', 'The prose style is understated, almost sparse at times', array['Logical progression through different aspects of the book'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of precise, natural review vocabulary.', null, array['''emotional beats'', ''melancholic tone'' show genuine critical vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Grammar is accurate with a good range of complex structures.', null, array['Accurate, natural use of concession structures (''though'', ''however'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;