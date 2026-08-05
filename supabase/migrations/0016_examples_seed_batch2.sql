-- Pasific Library batch 2: original examples for for_and_against_essay and
-- advantages_disadvantages_essay, spanning B1-C1 across developing/meets/strong bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'for_and_against_essay', 'B1', 'Working from Home — Developing B1 Response', 'Today many people can work from home because of computer and internet. Some people like this but other people dont like. In this essay I talk about good and bad point of working from home.

One good point is you dont need to travel to office. This save time and money for bus or train. Also you can spend more time with you family during the day.

But there is bad point too. When you work at home, sometimes is difficult to concentrate because there is many things around you like TV or family. Also some people feel alone because they dont see they colleague every day.

In my opinion, working from home have good and bad point, it depend on the person and the job.',
    51, 'developing',
    array['Clear for-and-against structure with two points each side','Attempts a balanced conclusion'], array['Frequent grammar errors (verb forms, plurals)','Vocabulary is limited and repeated'], 'The response covers both sides as required by the genre, but frequent errors with plural nouns and verb agreement, plus repetitive vocabulary, keep it at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'Both sides are covered with one point each, staying fairly general.', 'One good point is you dont need to travel to office.', array['Balanced coverage of both sides'], array['Add a second point on each side for fuller development']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows the for-and-against structure with a neutral tone until the final opinion.', null, array['Neutral register maintained in the body paragraphs'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Basic linkers (One good point, But there is) organise ideas but transitions are abrupt.', 'But there is bad point too.', array['Clear separation between for and against'], array['Use a wider range of contrast linkers than ''but''']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic with ''good point'' and ''bad point'' repeated throughout.', null, array['Correct use of ''concentrate'', ''colleague'''], array['Try ''advantage''/''disadvantage'' instead of repeating ''point''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 10, 'Frequent errors with plural nouns, articles and subject-verb agreement.', 'there is many things around you', array[]::text[], array['Review ''there is'' vs ''there are'' with plural nouns','Review missing articles (''the office'', ''the family'')'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 35, 'there is many things around you', 'mistake', 'subject_verb_agreement', '''Things'' is plural, so ''there are'' is needed, not ''there is''.', null, 'there are many things around you'),
    (0, 30, 'they dont see they colleague every day', 'mistake', 'pronouns', 'The possessive form ''their'' is needed before ''colleagues'', not the subject pronoun ''they''.', 'Use ''their'' + noun to show possession.', 'they don''t see their colleagues every day')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'for_and_against_essay', 'B2', 'Online Learning vs. Traditional Classrooms — Strong B2 Response', 'The rise of online learning platforms has raised an important question: is learning online as effective as attending a traditional classroom? This essay will examine the arguments on both sides before reaching a conclusion.

On the one hand, online learning offers considerable flexibility. Students can study at their own pace, revisit recorded lessons as many times as needed, and fit their studies around work or family commitments. It also removes geographical barriers, allowing access to courses that might not be available locally.

On the other hand, traditional classrooms provide something online learning struggles to replicate: direct interaction. Face-to-face discussion allows for immediate feedback, spontaneous questions, and the kind of social learning that comes from working alongside classmates. Furthermore, the structure of a physical classroom helps many students stay disciplined and focused, without the distractions available at home.

Having considered both perspectives, I believe the ideal approach is a blended one, combining the flexibility of online resources with the accountability and interaction of in-person sessions. Neither format alone fully addresses the diverse needs of learners.

In conclusion, both online and traditional learning have genuine strengths and weaknesses, and rather than choosing one over the other, education systems should aim to combine their best features.',
    85, 'strong',
    array['Balanced, well-developed treatment of both sides','Original synthesis in the conclusion (blended approach) rather than picking one side','Wide range of accurate, natural vocabulary'], array['A specific statistic on online learning outcomes would strengthen the case further'], 'A strong response because it goes beyond simply listing points for each side — it genuinely weighs them and reaches an original, well-reasoned synthesis rather than a generic conclusion.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'Both sides are fully developed and the conclusion offers a genuinely considered synthesis.', 'the ideal approach is a blended one, combining the flexibility of online resources with the accountability and interaction of in-person sessions', array['Original synthesis rather than simply picking a side'], array['Add a statistic or study reference for extra support']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Excellent command of the for-and-against genre with balanced, neutral development.', null, array['Maintains genuine balance until the conclusion'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 17, 'Very well organised with clear, varied linking devices.', 'Having considered both perspectives, I believe the ideal approach is a blended one', array['Smooth transition from balanced analysis to personal synthesis'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of precise, natural vocabulary used accurately.', null, array['''geographical barriers'', ''blended approach'' show precise topic vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Consistently accurate grammar with varied, complex sentence structures.', null, array['Confident use of gerund and participle clauses'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'for_and_against_essay', 'C1', 'Remote Work as the Default Model — Strong C1 Response', 'As organisations reassess their working arrangements in the wake of widespread remote-work experimentation, a contentious question has emerged: should remote work become the default model for office-based roles, rather than the exception? This essay weighs the principal arguments before arriving at a considered position.

Proponents of remote work as the default point to substantial gains in employee autonomy and wellbeing. Eliminating daily commutes returns, on average, several hours per week to employees, time that can be redirected towards family, rest or professional development. Moreover, companies embracing remote-first policies gain access to a far wider talent pool, unconstrained by geographic proximity to a physical office.

Conversely, sceptics argue that remote work erodes the informal, often unplanned interactions that catalyse innovation and mentorship. Junior employees, in particular, may struggle to absorb organisational culture or receive the incidental guidance that comes from observing more experienced colleagues in a shared space. There is also legitimate concern about the blurring of boundaries between work and personal life, which can paradoxically increase burnout rather than alleviate it.

Weighing these considerations, it seems unwise to treat remote work as a universal default; its suitability varies considerably by role, industry and individual working style. A more defensible position is one of structured flexibility, in which organisations establish clear expectations while allowing genuine choice wherever the nature of the work permits it.

In conclusion, rather than adopting remote work as an unqualified default, organisations would be better served by a differentiated approach that recognises the legitimate trade-offs on both sides of this debate.',
    92, 'strong',
    array['Sophisticated, evidence-aware treatment of both sides','Precise academic vocabulary used with full control','Genuinely nuanced final position rather than a simplistic verdict'], array['A specific study or company example would add further concrete grounding'], 'A strong C1 response: it resists the temptation to reach an easy verdict, instead building towards a genuinely differentiated conclusion supported by well-developed reasoning on both sides.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Both sides are explored with genuine depth, leading to a well-reasoned, nuanced conclusion.', 'it seems unwise to treat remote work as a universal default; its suitability varies considerably by role, industry and individual working style', array['Avoids a simplistic for/against verdict'], array['Cite a specific company or study for concrete grounding']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the sophisticated register expected of a C1 for-and-against essay.', null, array['Genuinely balanced treatment maintained until the final paragraphs'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent logical progression with sophisticated, varied cohesive devices.', 'Weighing these considerations, it seems unwise to treat remote work as a universal default', array['Clear signal of the shift from analysis to personal position'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide-ranging, precise academic vocabulary used with confidence throughout.', null, array['''catalyse innovation'', ''differentiated approach'' show sophisticated word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Complex grammar handled accurately and with confidence throughout.', null, array['Effective use of subordinate clauses and parallel structure'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'advantages_disadvantages_essay', 'B1', 'Living Alone — Developing B1 Response', 'Many young people decide to live alone when they finish they study. This essay will talk about advantage and disadvantage of living alone.

One advantage is freedom. When you live alone, you can do what you want, like watching TV late or inviting friend anytime. Nobody tell you what to do.

Another advantage is you learn to be independent. You must cook, clean and manage you money by yourself, this teach many useful skill for life.

However, there is disadvantage too. Living alone can be expensive because you pay all the bill yourself. Also, some people feel lonely because they dont have someone to talk every day.

In conclusion, living alone has advantage and disadvantage, but I think it is good experience for young people if they can manage the money.',
    53, 'developing',
    array['Two advantages and two disadvantages given, matching the genre requirement','Clear final opinion'], array['Frequent possessive pronoun errors (''they'' for ''their'')','Missing articles and plural forms throughout'], 'This response correctly follows the advantages-disadvantages structure with two points on each side, but frequent errors with possessive pronouns and missing articles keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 12, 'Two advantages and two disadvantages are given with a personal opinion in the conclusion.', 'One advantage is freedom.', array['Matches the exact genre requirement of two points each side'], array['Develop each point with a specific example']),
    ('crit_genre_achievement', 'genre_achievement', 12, 'Correctly structured as advantages then disadvantages then opinion, as the genre requires.', null, array['Clear genre-appropriate structure'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Basic linkers organise the ideas but the range is narrow.', 'However, there is disadvantage too.', array['Clear paragraph for each point'], array['Use a wider range of linking phrases']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic and ''advantage''/''disadvantage'' are repeated many times.', null, array['Correct use of ''independent'', ''manage'''], array['Try ''a downside'' or ''a drawback'' as alternatives to ''disadvantage''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with possessive pronouns, plurals and articles.', 'they finish they study', array[]::text[], array['Review possessive adjectives: ''their'' not ''they''','Review plural nouns after ''many'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 30, 'they finish they study', 'mistake', 'pronouns', 'The possessive ''their'' is needed before ''studies'', not the subject pronoun ''they''.', null, 'they finish their studies'),
    (0, 30, 'manage you money by yourself', 'mistake', 'pronouns', 'The possessive adjective ''your'' is needed, not the subject pronoun ''you''.', '''Your'' comes before a noun; ''you'' is the subject/object pronoun.', 'manage your money by yourself')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'advantages_disadvantages_essay', 'B2', 'Studying Abroad — Meets Expectations B2 Response', 'An increasing number of students choose to complete part of their studies in another country. While this experience offers clear benefits, it also comes with certain drawbacks that are worth considering.

One of the main advantages of studying abroad is exposure to a new culture and language. Living in a different country forces students to adapt quickly, develop independence, and often become more fluent in a foreign language than they would through classroom study alone. In addition, international study often looks impressive on a graduate''s CV, signalling adaptability to future employers.

However, studying abroad is not without its challenges. The financial cost, including tuition, accommodation and travel, can be considerably higher than staying at a local university, putting this option out of reach for many families. Furthermore, some students experience culture shock or homesickness, which can negatively affect both their wellbeing and their academic performance, at least in the initial months.

In conclusion, while studying abroad offers valuable opportunities for personal and professional growth, students should weigh these benefits carefully against the financial and emotional costs involved before making a decision.',
    79, 'meets_expectations',
    array['Well-developed advantages and disadvantages with specific reasoning','Balanced, appropriately academic tone','Clear topic sentences for each paragraph'], array['A specific statistic on cost or student numbers would strengthen the argument'], 'This response meets B2 expectations with clearly developed points on both sides and an appropriately balanced tone. A concrete statistic would help it reach the strong band.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'Advantages and disadvantages are both well developed with relevant reasoning.', 'exposure to a new culture and language', array['Reasoning goes beyond a surface-level list'], array['A specific cost figure would strengthen the financial point']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Correct genre structure with a balanced, academic tone throughout.', null, array['Neutral, weighing tone maintained until the conclusion'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear organisation with varied linking devices (However, Furthermore, In addition).', 'Furthermore, some students experience culture shock or homesickness', array['Smooth transitions between points'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of topic-appropriate vocabulary used accurately.', null, array['''culture shock'', ''signalling adaptability'' show precise word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate throughout with a good range of structures.', null, array['Accurate comparative and conditional structures'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'advantages_disadvantages_essay', 'C1', 'Automation in the Workplace — Strong C1 Response', 'The accelerating adoption of automation technologies across industries presents organisations and workers alike with a complex set of trade-offs. Assessing these advantages and disadvantages is essential to navigating this transition responsibly.

Among the most significant advantages is a marked increase in productivity. Automated systems can perform repetitive tasks with greater speed, consistency and precision than human workers, freeing employees to focus on higher-value activities that require creativity, judgement or interpersonal skill. Additionally, automation can improve workplace safety by removing humans from hazardous environments, such as certain manufacturing or mining processes.

Nevertheless, these gains come with substantial costs. The most pressing concern is job displacement: roles involving routine, predictable tasks are particularly vulnerable, and the transition can leave affected workers without a clear path to comparably paid employment. Moreover, the benefits of automation-driven productivity gains have not always been distributed equitably, often accruing disproportionately to capital owners rather than the wider workforce, which risks exacerbating existing inequality.

On balance, automation should be understood not as an unambiguous good or ill, but as a transformation whose ultimate impact depends heavily on the policy choices that accompany it, including retraining programmes, social safety nets, and mechanisms to ensure productivity gains are more broadly shared.

In conclusion, while automation offers genuine efficiency and safety benefits, its disruptive effects on employment and inequality demand deliberate policy responses rather than passive acceptance.',
    93, 'strong',
    array['Sophisticated, well-substantiated treatment of both advantages and disadvantages','Genuinely policy-aware conclusion rather than a simple summary','Precise, wide-ranging academic vocabulary'], array['A specific statistic on job displacement would strengthen the argument further'], 'A strong C1 response: it moves past a generic advantages/disadvantages list to a genuinely policy-oriented conclusion, supported throughout by precise, controlled academic language.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Both sides are explored with genuine sophistication, leading to a well-substantiated, policy-aware conclusion.', 'automation should be understood not as an unambiguous good or ill, but as a transformation whose ultimate impact depends heavily on the policy choices', array['Moves beyond a simple list to a genuinely analytical conclusion'], array['Cite a specific statistic on job displacement']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the sophisticated register expected of a C1 advantages-disadvantages essay.', null, array['Balanced, analytical tone maintained throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent logical progression with sophisticated cohesive devices.', 'Nevertheless, these gains come with substantial costs.', array['Clear, confident transitions between complex ideas'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide range of precise, specialised vocabulary used with confidence.', null, array['''accruing disproportionately'', ''exacerbating existing inequality'' show sophisticated control'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Complex grammar handled with confidence and near-total accuracy.', null, array['Effective use of non-finite clauses throughout'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;