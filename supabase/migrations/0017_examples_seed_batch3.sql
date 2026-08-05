-- Pasific Library batch 3: original examples for problem_solution_essay and
-- cause_effect_essay, spanning B1-C2 across developing/meets/strong/advanced bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'B1', 'Traffic Congestion in Cities — Developing B1 Response', 'Traffic jam is a big problem in many big city today. This essay will talk about the problem and give some solution.

The main problem is too many car in the city. Every morning and evening, the road is full of car and people wait long time to arrive they work. This make people late and also angry.

One solution is city can build more public transport like bus and metro. If the transport is cheap and fast, more people will use it instead they car.

Another solution is government can make special lane for bicycle. This help people to use bicycle for short distance instead of car.

In conclusion, traffic jam is serious problem but with better public transport and bicycle lane, city can reduce it.',
    52, 'developing',
    array['Two relevant, workable solutions given','Problem and solutions are clearly separated'], array['Frequent article and plural errors','Possessive pronoun ''they'' used instead of ''their'''], 'The problem-solution structure is followed correctly, but frequent missing articles, plural errors and the repeated ''they''/''their'' confusion keep this at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'A clear problem is identified and two relevant solutions are proposed.', 'One solution is city can build more public transport', array['Solutions are realistic and relevant'], array['Explain how each solution would work in more detail']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows the problem-solution structure appropriately for the level.', null, array['Clear problem paragraph followed by solution paragraphs'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Basic linkers (One solution, Another solution) organise ideas adequately.', 'Another solution is government can make special lane for bicycle.', array['One idea per paragraph'], array['Vary linking phrases beyond ''One solution''/''Another solution''']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic with ''car'' and ''problem'' repeated frequently.', null, array['Correct use of ''public transport'', ''bicycle lane'''], array['Try ''vehicles'' or ''traffic'' as alternatives to repeated ''car''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 10, 'Frequent errors with articles, plurals and possessives.', 'people wait long time to arrive they work', array[]::text[], array['Review possessive adjectives: ''their'' not ''they''','Review missing articles before singular countable nouns'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 40, 'people wait long time to arrive they work', 'mistake', 'pronouns', 'The possessive ''their'' is needed before ''work'', not the subject pronoun ''they''.', null, 'people wait a long time to arrive at their work'),
    (0, 30, 'more people will use it instead they car', 'mistake', 'pronouns', 'Same error: ''their'' is the correct possessive form before ''car''.', 'Use ''their'' + noun to show possession.', 'more people will use it instead of their car')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'B1', 'Littering in Public Parks — Meets Expectations B1 Response', 'Many public parks in our city have a serious littering problem. This essay will explain the causes of this problem and suggest some possible solutions.

One reason for the littering is that there are not enough bins in the parks. When people cannot find a bin nearby, some of them simply drop their rubbish on the ground instead of carrying it further. Another reason is that some visitors are simply not aware of how their actions affect the environment.

To solve this problem, the city council could install more bins around the park, especially near popular areas like playgrounds and picnic spots. In addition, schools and local media could run campaigns to teach people, especially children, about the importance of keeping public spaces clean.

In conclusion, littering in parks is a real problem, but with more bins and better public awareness, it can be significantly reduced over time.',
    69, 'meets_expectations',
    array['Clear cause-then-solution structure with matching pairs','Good range of linking devices'], array['Solutions could be slightly more specific','Some repetition of ''problem'''], 'A well-organised B1 response that correctly pairs causes with matching solutions. Slightly more specific detail (e.g. how a campaign would work) would raise the score further.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 14, 'Two causes and two matching solutions are clearly presented.', 'the city council could install more bins around the park', array['Solutions directly match the causes identified'], array['Add detail on how a campaign would be run']),
    ('crit_genre_achievement', 'genre_achievement', 14, 'Correct problem-solution structure with clear cause and solution paragraphs.', null, array['Clean division between causes and solutions'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 14, 'Good use of linkers (One reason, Another reason, In addition).', 'In addition, schools and local media could run campaigns', array['Clear paragraph-level organisation'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 13, 'Adequate range with accurate topic-specific vocabulary.', null, array['''public awareness'', ''popular areas'' used naturally'], array['Reduce repetition of ''problem''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 14, 'Grammar is accurate throughout with only minor issues.', null, array['Accurate modal verbs (could) used for suggestions'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'B2', 'Youth Unemployment — Meets Expectations B2 Response', 'Youth unemployment remains one of the most persistent economic challenges facing many countries today. This essay examines the main causes of the problem and proposes several realistic solutions.

One significant cause of youth unemployment is the mismatch between the skills taught in education and the skills demanded by employers. Many graduates leave university with strong theoretical knowledge but little practical experience, making them less attractive to companies looking for immediately productive employees. Additionally, economic downturns tend to affect young workers disproportionately, as they are often the first to be let go and the last to be hired during recovery.

Addressing this issue requires coordinated action. Firstly, educational institutions could strengthen partnerships with businesses to offer more internships and work-based learning opportunities, helping students graduate with relevant experience. Secondly, governments could introduce incentives, such as tax reductions, for companies that hire and train young workers, making it more financially attractive to invest in this group.

In conclusion, while youth unemployment stems from a complex mix of educational and economic factors, closer cooperation between schools, businesses and government could meaningfully improve the situation for young jobseekers.',
    79, 'meets_expectations',
    array['Well-developed causes with clear reasoning','Solutions are specific and directly address the causes','Appropriate academic register'], array['A specific statistic on youth unemployment rates would add support'], 'This response meets B2 expectations with clearly developed causes and correspondingly specific solutions. A real statistic would push it towards the strong band.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'Causes and solutions are both well developed and logically connected.', 'the mismatch between the skills taught in education and the skills demanded by employers', array['Solutions directly address the identified causes'], array['Cite an actual unemployment statistic']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Strong problem-solution structure appropriate to a B2-level analytical essay.', null, array['Clear division between cause analysis and proposed solutions'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Well-organised with varied linking devices (Additionally, Firstly, Secondly).', 'Secondly, governments could introduce incentives, such as tax reductions', array['Logical progression between paragraphs'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of topic-specific vocabulary used accurately.', null, array['''work-based learning'', ''financially attractive'' show precise phrasing'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate with a good range of complex structures.', null, array['Accurate use of comparative structures (''less attractive'', ''more attractive'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'B2', 'Air Pollution in Urban Areas — Strong B2 Response', 'Air pollution has become a defining public health crisis in cities around the world, contributing to respiratory disease and reducing life expectancy for millions of residents. This essay explores the primary causes of urban air pollution and outlines practical measures to address it.

Vehicle emissions represent one of the largest contributors to poor air quality, particularly in cities where public transport is limited or unreliable, pushing residents towards private car use. Industrial activity compounds the problem, as factories on the outskirts of cities often release pollutants with limited regulatory oversight, especially in rapidly industrialising regions.

Several measures could meaningfully reduce urban air pollution. Expanding and improving public transport networks, alongside congestion charges in city centres, would reduce reliance on private vehicles considerably, as several European cities have already demonstrated. Simultaneously, stricter emissions standards for factories, combined with genuine enforcement rather than nominal regulation, would address the industrial side of the problem.

Crucially, these solutions are unlikely to succeed in isolation; a comprehensive strategy combining transport reform, industrial regulation and public awareness campaigns offers the most realistic path to cleaner air.

In conclusion, tackling urban air pollution demands coordinated action across transport and industry, but the health benefits at stake make such investment well worthwhile.',
    86, 'strong',
    array['Specific, well-developed causes with real-world grounding','Solutions are concrete and acknowledge the need for a combined approach','Sophisticated vocabulary and cohesion'], array['Naming a specific city with a successful policy would strengthen the argument further'], 'A strong B2 response because it recognises that individual solutions are insufficient alone and argues for a coordinated strategy — a genuinely sophisticated move for this level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 17, 'Causes and solutions are thoroughly developed with a sophisticated final synthesis.', 'a comprehensive strategy combining transport reform, industrial regulation and public awareness campaigns offers the most realistic path', array['Recognises that solutions must be combined, not applied in isolation'], array['Name a specific city as a real-world example']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Fully achieves the problem-solution genre with sophisticated, well-organised development.', null, array['Clear cause-solution pairing throughout'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 17, 'Excellent cohesion with varied, sophisticated linking devices.', 'Crucially, these solutions are unlikely to succeed in isolation', array['The ''crucially'' paragraph effectively ties the argument together'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of precise, topic-specific vocabulary.', null, array['''nominal regulation'', ''compounds the problem'' show sophisticated word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Consistently accurate, varied grammar throughout.', null, array['Confident use of participle clauses'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'C1', 'Declining Bee Populations — Strong C1 Response', 'The alarming decline of bee populations worldwide poses a threat that extends far beyond entomology, given that bees pollinate roughly a third of the crops humans consume. Understanding the drivers of this decline and formulating effective responses is therefore a matter of considerable urgency.

Several interrelated factors appear to be driving the decline. Widespread use of neonicotinoid pesticides has been repeatedly linked to impaired navigation and reproduction in bee colonies. Habitat loss, driven by intensive monoculture farming, has simultaneously reduced the diversity of flowering plants bees rely on throughout the season. Compounding these pressures, parasites such as the Varroa mite have spread rapidly, weakening colonies already under stress from the factors above.

Addressing this crisis will require intervention at multiple levels. Regulatory restriction of the most harmful pesticides, following the precautionary approach already adopted by the European Union, would directly reduce one major stressor. Simultaneously, incentivising farmers to maintain wildflower margins and diversify crops would restore some of the habitat complexity that industrial agriculture has eliminated. Investment in Varroa-resistant breeding programmes offers a further, more technical avenue for reducing colony losses.

Ultimately, no single measure will reverse bee decline in isolation; only a coordinated combination of regulatory, agricultural and scientific interventions offers a realistic prospect of stabilising pollinator populations before the ecological and economic consequences become irreversible.',
    92, 'strong',
    array['Sophisticated, scientifically grounded causal analysis','Multi-level solutions with real-world regulatory precedent','Precise, wide-ranging academic vocabulary'], array['A specific statistic on the scale of decline would strengthen the opening'], 'A strong C1 response: the cause analysis goes beyond generalities into interrelated, specific factors, and the solutions section mirrors this sophistication with a genuinely coordinated, multi-level proposal.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Causes and solutions are explored with genuine scientific and policy sophistication.', 'no single measure will reverse bee decline in isolation; only a coordinated combination of regulatory, agricultural and scientific interventions', array['Interrelated causal factors are explicitly connected, not just listed'], array['Add a specific statistic on population decline']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the register expected of a C1 problem-solution essay.', null, array['EU regulatory precedent grounds the proposal in reality'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent cohesion with sophisticated cause-effect and solution linking.', 'Compounding these pressures, parasites such as the Varroa mite have spread rapidly', array['Each cause builds logically on the previous one'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Precise, specialised vocabulary used with full control.', null, array['''neonicotinoid pesticides'', ''precautionary approach'' show genuine subject fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammar handled with confidence and accuracy throughout.', null, array['Effective use of participle and comparative clauses'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'problem_solution_essay', 'C2', 'Antibiotic Resistance — Advanced C2 Response', 'Antimicrobial resistance ranks among the gravest slow-moving crises confronting global public health, threatening to render once-routine medical procedures, from minor surgery to chemotherapy, perilously dangerous within a matter of decades. A rigorous examination of its drivers and a correspondingly ambitious policy response are long overdue.

The crisis stems from a convergence of factors operating across human medicine, agriculture and pharmaceutical economics. Overprescription of antibiotics for viral infections, against which they are wholly ineffective, has accelerated the evolutionary pressure favouring resistant bacterial strains. In parallel, the routine, prophylactic use of antibiotics in industrial livestock farming — often to promote growth rather than treat illness — constitutes an enormous, largely unregulated reservoir for resistance to emerge and spread into human populations. Compounding matters further, the pharmaceutical industry has systematically underinvested in novel antibiotic development, since the economics of a drug intended for short-term, curative use compare unfavourably with those of chronic-disease medications.

A credible policy response must therefore intervene simultaneously across these three domains. Robust antimicrobial stewardship programmes in healthcare settings, incorporating rapid diagnostic testing to distinguish bacterial from viral infections, could substantially curb unnecessary prescribing. Regulatory prohibition of non-therapeutic antibiotic use in agriculture, as several Nordic countries have already implemented with demonstrable success, would close off a major transmission pathway. Finally, market-correcting mechanisms — such as public subsidies, extended patent protections, or delinked reimbursement models that pay for antibiotic availability rather than volume sold — are essential to revive a moribund development pipeline.

In conclusion, averting a post-antibiotic era demands a fundamentally systemic response: piecemeal measures addressing only prescribing behaviour, agricultural practice, or pharmaceutical incentives in isolation will prove insufficient against a threat that spans all three.',
    97, 'advanced',
    array['Exceptionally sophisticated, multi-domain causal analysis','Precise, technically accurate vocabulary used with total control','Genuinely systemic solution that explicitly rejects piecemeal alternatives'], array[]::text[], 'An exemplary C2 response: the writer identifies genuinely distinct causal domains (clinical, agricultural, economic) and proposes a correspondingly specific solution for each, concluding with a sophisticated argument for systemic rather than piecemeal intervention.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 20, 'An exceptionally thorough, multi-domain treatment of both causes and solutions.', 'piecemeal measures addressing only prescribing behaviour, agricultural practice, or pharmaceutical incentives in isolation will prove insufficient', array['Explicitly argues against piecemeal solutions, a genuinely advanced move'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful command of the problem-solution genre at the highest level.', null, array['Nordic agricultural precedent grounds the proposal in verifiable policy'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 20, 'Impeccably organised with each cause paired precisely to its corresponding solution.', 'A credible policy response must therefore intervene simultaneously across these three domains.', array['The three-domain structure is maintained consistently from cause to solution'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, technical vocabulary used with complete accuracy.', null, array['''delinked reimbursement models'', ''prophylactic use'' show genuine domain expertise'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex sentence structures handled with near-total accuracy.', null, array['Confident use of em-dashes and layered subordination'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e7 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'cause_effect_essay', 'B1', 'Why Students Feel Stressed — Developing B1 Response', 'Many students feel stress at school today. This essay will explain the cause and effect of this problem.

One cause of stress is too much homework. Teacher give many homework every day and student dont have time to rest. Another cause is exam, because student worry about they grade and what parent will say.

This stress have bad effect on student. First, student cannot sleep good because they think about school all the time. Second, some student stop enjoy studying because it become only about grade, not learning.

In conclusion, homework and exam is big cause of stress for student, and this stress effect they sleep and they love for learning.',
    50, 'developing',
    array['Two clear causes matched with two clear effects','Topic is relevant and relatable'], array['Frequent subject-verb agreement errors','Possessive pronoun ''they'' used repeatedly instead of ''their'''], 'The cause-effect pairing is logical, but frequent subject-verb agreement errors and the repeated ''they''/''their'' confusion are the main barriers to a higher score.'
  )
  returning id
),
e7_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e7, (values
    ('crit_task_fulfilment', 'task_fulfilment', 10, 'Two causes are identified and matched with corresponding effects.', 'One cause of stress is too much homework.', array['Clear cause-effect pairing'], array['Develop each cause and effect with a specific example']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows the cause-effect structure appropriately for the level.', null, array['Clear separation between cause and effect paragraphs'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Basic linkers (One cause, Another cause, First, Second) organise ideas but the range is narrow.', 'First, student cannot sleep good', array['One idea per paragraph'], array['Use cause-effect linkers like ''as a result'' or ''this leads to''']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic with ''stress'' and ''student'' repeated frequently.', null, array['Correct use of ''grade'', ''homework'''], array['Try ''pupils'' or ''learners'' as alternatives to ''student''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent subject-verb agreement and possessive errors reduce accuracy.', 'Teacher give many homework every day', array[]::text[], array['Review third person ''-s'' in present simple','Review possessive adjective ''their'' vs subject pronoun ''they'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e7_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e7, (values
    (0, 30, 'Teacher give many homework every day', 'mistake', 'subject_verb_agreement', '''Teacher'' (singular) needs the verb ''-s'': ''gives''. Also ''homework'' is uncountable, so it doesn''t take ''many''.', null, 'Teachers give a lot of homework every day'),
    (0, 35, 'student worry about they grade', 'mistake', 'pronouns', 'The possessive ''their'' is needed before ''grades'', not the subject pronoun ''they''.', 'Use ''their'' + noun to show possession.', 'students worry about their grades')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e8 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'cause_effect_essay', 'B1', 'Causes and Effects of Obesity in Teenagers — Meets Expectations B1 Response', 'Obesity among teenagers has become more common in recent years. This essay will look at the main causes of this problem and the effects it has on young people''s lives.

One of the main causes is unhealthy eating habits. Many teenagers eat a lot of fast food and sugary drinks instead of fruit and vegetables, mainly because fast food is cheap and convenient. Another cause is a lack of physical activity, since many young people spend hours playing video games or using their phones instead of doing sport.

As a result of these habits, obesity can lead to several serious effects. Firstly, it increases the risk of health problems such as diabetes and heart disease later in life. Secondly, overweight teenagers sometimes experience bullying or low self-esteem, which can affect their mental health and confidence at school.

In conclusion, poor diet and lack of exercise are the main causes of teenage obesity, and the effects, both physical and emotional, can be serious and long-lasting.',
    71, 'meets_expectations',
    array['Clear cause-effect structure with appropriate linkers','Covers both physical and emotional effects, showing good development'], array['Could include a specific statistic or example','Some sentences could be shortened for clarity'], 'A well-organised B1 response that pairs causes with clearly developed effects, distinguishing between physical and emotional consequences — a mature move for this level.'
  )
  returning id
),
e8_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e8, (values
    ('crit_task_fulfilment', 'task_fulfilment', 14, 'Causes and effects are clearly identified and appropriately developed.', 'overweight teenagers sometimes experience bullying or low self-esteem', array['Distinguishes between physical and emotional effects'], array['Add a specific statistic on teenage obesity rates']),
    ('crit_genre_achievement', 'genre_achievement', 14, 'Correct cause-effect structure with clear paragraphing.', null, array['Clean separation between causes and effects'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 14, 'Good use of cause-effect linkers (As a result, Firstly, Secondly).', 'As a result of these habits, obesity can lead to several serious effects.', array['Clear cause-to-effect transition'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 14, 'Good range of topic-specific vocabulary used accurately.', null, array['''sugary drinks'', ''low self-esteem'' show accurate topic vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 15, 'Grammar is accurate throughout with only minor issues.', null, array['Accurate use of comparative and cause-effect structures'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e9 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'cause_effect_essay', 'B2', 'Effects of Tourism on Small Towns — Meets Expectations B2 Response', 'Tourism can bring significant change to small towns, and while much of this change is positive, some effects are more problematic. This essay examines the main causes behind rising tourism in small towns and the effects that follow.

The primary driver of increased tourism in small towns is often social media, where visually striking locations quickly become popular after being shared widely online. Improved transport infrastructure, such as new roads or budget flights, further makes previously remote towns more accessible to visitors.

As a result of this growth, small towns often experience considerable economic benefits, including new jobs in hospitality and increased revenue for local businesses. However, rapid tourism growth can also cause overcrowding, driving up housing costs for local residents and placing strain on infrastructure that was never designed for such visitor numbers. In some cases, the character of the town itself changes, as traditional shops are replaced by souvenir stores catering primarily to tourists.

In conclusion, while tourism can revitalise small towns economically, unmanaged growth risks undermining the very qualities that attracted visitors in the first place, suggesting that careful planning is essential to sustaining these benefits long-term.',
    80, 'meets_expectations',
    array['Balanced treatment of both positive and negative effects','Specific, well-developed causes (social media, transport infrastructure)','Appropriate academic register'], array['Naming a specific town as an example would strengthen the essay'], 'This response meets B2 expectations with well-developed, specific causes and a balanced view of both positive and negative effects. A concrete example would push it towards strong.'
  )
  returning id
),
e9_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e9, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'Causes and effects are both well developed, with a balanced view of positive and negative outcomes.', 'unmanaged growth risks undermining the very qualities that attracted visitors in the first place', array['Recognises both economic benefit and social cost'], array['Name a specific town as a concrete example']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Strong cause-effect structure appropriate to a B2-level analytical essay.', null, array['Clear progression from cause to multiple, distinct effects'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Well-organised with varied linking devices (As a result, However, In some cases).', 'However, rapid tourism growth can also cause overcrowding', array['Smooth contrast between positive and negative effects'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 16, 'Good range of precise, topic-specific vocabulary.', null, array['''revitalise'', ''catering primarily to tourists'' show precise word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate with a good range of complex structures.', null, array['Accurate use of passive voice and participle clauses'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e10 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'cause_effect_essay', 'C1', 'Causes and Effects of Income Inequality — Strong C1 Response', 'Income inequality has widened considerably in many advanced economies over the past four decades, prompting extensive debate over both its origins and its consequences. This essay examines the principal drivers of this trend and the effects it has had on society.

Several interlinked factors have contributed to rising inequality. Technological change has disproportionately rewarded highly skilled workers while displacing many routine, middle-income jobs through automation. Globalisation has similarly exposed lower-skilled domestic workers to competition from lower-wage economies, exerting downward pressure on their wages. Meanwhile, shifts in tax policy across many countries have reduced the redistributive effect of taxation, allowing wealth to accumulate more rapidly among top earners.

The consequences of this widening gap extend well beyond simple disparities in income. Social mobility tends to decline in highly unequal societies, as access to quality education and professional networks becomes increasingly correlated with parental wealth. Furthermore, research has linked high inequality to lower social trust and increased political polarisation, as citizens perceive the economic system as fundamentally unfair. Economically, excessive inequality can also dampen aggregate demand, since lower and middle-income households, who spend a higher proportion of their income, have comparatively less purchasing power.

In conclusion, income inequality arises from a complex interplay of technological, economic and policy factors, and its effects extend well beyond finance into the social and political fabric of society, underscoring why addressing it matters for reasons beyond fairness alone.',
    91, 'strong',
    array['Sophisticated, multi-factor causal analysis','Effects extend beyond the obvious into social and political dimensions','Precise, wide-ranging academic vocabulary'], array['A specific statistic (e.g. Gini coefficient trend) would strengthen the opening'], 'A strong C1 response because the effects analysis goes well beyond the economic dimension into social trust and political polarisation, showing genuine depth of thought.'
  )
  returning id
),
e10_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e10, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Causes and effects are explored with genuine sophistication across economic, social and political dimensions.', 'high inequality to lower social trust and increased political polarisation', array['Effects analysis extends well beyond the economic dimension'], array['Add a specific statistic to ground the opening claim']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the register expected of a C1 cause-effect essay.', null, array['Clear, sophisticated separation of causes and effects'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent cohesion with sophisticated cause-effect linking throughout.', 'Meanwhile, shifts in tax policy across many countries have reduced the redistributive effect of taxation', array['Each cause is distinct and clearly connected to the next'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide-ranging, precise academic vocabulary used with confidence.', null, array['''redistributive effect'', ''aggregate demand'' show genuine subject fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Complex grammar handled with confidence and accuracy throughout.', null, array['Effective use of participle clauses and subordination'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e11 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'cause_effect_essay', 'C2', 'Social Media and Political Polarisation — Advanced C2 Response', 'The proliferation of social media has coincided with a marked intensification of political polarisation across numerous democracies, a correlation that has attracted intense scrutiny from researchers seeking to disentangle causation from mere coincidence. This essay examines the mechanisms plausibly linking the two phenomena and traces their downstream societal effects.

Several interlocking mechanisms appear to drive this relationship. Algorithmic curation, optimised primarily for engagement rather than accuracy or balance, tends to amplify emotionally charged, often divisive content, since such material reliably generates higher interaction rates. This dynamic is compounded by the fragmentation of the media landscape into ideologically homogeneous communities, or ''filter bubbles'', within which users are rarely exposed to counter-attitudinal perspectives, thereby reinforcing existing beliefs rather than challenging them. Furthermore, the low barrier to publishing has enabled the rapid, low-cost dissemination of misinformation and coordinated disinformation campaigns, which exploit and further entrench partisan divisions.

The downstream effects of this dynamic are considerable. Political discourse has grown markedly more adversarial, with compromise increasingly framed as capitulation rather than legitimate democratic negotiation. Trust in shared institutions — electoral systems, judiciaries, and the media itself — has correspondingly eroded, as competing factions increasingly inhabit distinct, mutually incompatible epistemic realities. In extreme cases, this erosion of shared factual ground has contributed to civil unrest, as contested elections or policy decisions are no longer reliably accepted as legitimate by all sides.

In conclusion, while social media did not create political division from nothing, its architecture appears to have substantially amplified pre-existing fault lines, with consequences that extend from individual attitudes to the stability of democratic institutions themselves.',
    98, 'advanced',
    array['Exceptionally sophisticated, mechanism-based causal analysis rather than mere correlation','Effects trace a genuinely coherent chain from individual psychology to institutional stability','Precise, near-native academic vocabulary used with total control'], array[]::text[], 'An outstanding C2 response: rather than simply asserting a link, the writer carefully identifies specific causal mechanisms and traces a coherent chain of effects from individual cognition to democratic institutions — genuinely sophisticated analytical writing.'
  )
  returning id
),
e11_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e11, (values
    ('crit_task_fulfilment', 'task_fulfilment', 20, 'An exceptionally sophisticated treatment that distinguishes correlation from causal mechanism.', 'a correlation that has attracted intense scrutiny from researchers seeking to disentangle causation from mere coincidence', array['Explicit awareness of the correlation/causation distinction is a genuinely advanced move'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful command of the cause-effect essay genre at the highest level.', null, array['''Filter bubbles'' concept is integrated precisely and explained, not just named'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 20, 'Impeccably organised with a coherent causal chain from mechanism to societal effect.', 'The downstream effects of this dynamic are considerable.', array['Clear escalation from individual to institutional-level effects'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, specialised vocabulary used with complete control.', null, array['''epistemic realities'', ''counter-attitudinal perspectives'' show genuine domain fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex sentence structures handled with near-total accuracy.', null, array['Confident, varied use of em-dashes and layered subordination'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;