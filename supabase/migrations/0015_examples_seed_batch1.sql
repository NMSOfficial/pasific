-- Pasific Library batch 1: original examples for opinion_essay and argumentative_essay,
-- 6 each spanning B1-C2 across developing/meets/strong/advanced bands.
-- Written from scratch for Pasific (not copied from any external source)
-- to exactly match the app's rubric-criterion and annotation schema.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'B1', 'School Uniforms — Developing B1 Response', 'In my opinion, I think school uniform is good idea for students. Many school in my country dont have uniform but I think it must change.

First reason is uniform make all students look same. Rich student and poor student wear same clothes so nobody feel bad about they clothes. This is very important for young peoples.

Second reason, when you wearing uniform you dont need to thinking what to wear every morning. This save time and also save money for the family because they dont buy many different clothes.

Some people says uniform stop students to show their personality. But I dont agree because student can show personality in other way, like in they hobby or they opinion in class.

In conclusion, I believe school uniform is a good thing for school because it make equal between students and it save time and money.',
    54, 'developing',
    array['Clear personal opinion stated early and repeated in conclusion','Two distinct reasons given'], array['Frequent verb tense and agreement errors','Repetition of ''uniform'' without variation','Counter-argument is underdeveloped'], 'This response has a clear opinion and basic structure, but frequent grammar errors (verb forms, plurals) and repetitive vocabulary keep it at a developing B1 level. The next step is targeted practice on present simple verb forms.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 12, 'An opinion is given and supported with two reasons, though development is basic.', 'In my opinion, I think school uniform is good idea for students.', array['Clear stance from the first sentence'], array['Add a specific example rather than general statements']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows a basic opinion essay shape (intro, two reasons, counter-argument, conclusion).', null, array['Counter-argument paragraph is attempted'], array['Conclusion simply repeats the introduction instead of adding a final thought']),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Paragraphs are organised by reason but linking is basic and repetitive (''First reason'', ''Second reason'').', 'First reason is uniform make all students look same.', array['One clear idea per paragraph'], array['Use a wider range of linkers than ''First reason'' / ''Second reason''']),
    ('crit_vocabulary_range', 'vocabulary_range', 10, 'Vocabulary is basic and ''uniform'' is repeated many times without a synonym.', null, array['Topic-appropriate everyday vocabulary'], array['Try synonyms such as ''school clothing'' or ''the dress code''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 10, 'Frequent errors in verb forms, plurals and articles reduce accuracy.', 'Many school in my country dont have uniform', array[]::text[], array['Review plural nouns (''schools'', ''students'')','Review present simple third person ''-s''','Add apostrophes to contractions (don''t)'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 30, 'Many school in my country dont', 'mistake', 'singular_plural', '''School'' needs a plural ''-s'' after ''many''.', 'Countable nouns take ''-s'' after ''many''.', 'Many schools in my country don''t'),
    (0, 40, 'uniform make all students look same', 'mistake', 'subject_verb_agreement', '''Uniform'' is singular, so the verb needs ''-s'': ''makes''.', null, 'the uniform makes all students look the same'),
    (0, 20, 'Rich student and poor student', 'inaccuracy', 'singular_plural', 'These general nouns should be plural: ''rich students and poor students''.', null, 'Rich students and poor students')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'B1', 'Living in a Big City — Meets Expectations B1 Response', 'Nowadays, more and more people choose to live in big cities. In my opinion, living in a big city is better than living in a small town, for two main reasons.

Firstly, big cities offer more job opportunities. There are many companies and factories, so it is easier to find a good job with a good salary. In a small town, there are fewer companies, so young people often have to move away to find work.

Secondly, cities have better services. For example, there are more hospitals, schools and universities. Public transport is also usually better, so people do not need a car to travel around the city.

Of course, small towns are quieter and the air is cleaner, and some people prefer this kind of life. However, for most young people who want a career, I think the city is a better choice.

In conclusion, although small towns have some advantages, I believe big cities offer more opportunities for work and a better quality of services.',
    68, 'meets_expectations',
    array['Clear two-reason structure with topic sentences','Acknowledges the opposite view before concluding'], array['Some generic statements without specific examples','Limited range of complex sentences'], 'A solid B1 response with a clear structure and appropriate linking words. To move up a band, the writer should add specific examples (a named city, a real statistic) instead of general claims.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 14, 'The opinion is clear and supported by two relevant reasons with a brief counter-argument.', 'living in a big city is better than living in a small town, for two main reasons', array['Balanced acknowledgement of the other side'], array['Add one concrete example, e.g. a specific city or job sector']),
    ('crit_genre_achievement', 'genre_achievement', 14, 'Follows the opinion essay format well: introduction with thesis, two body paragraphs, counter-view, conclusion.', null, array['Clear thesis statement in the introduction'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 14, 'Good use of sequencing linkers (Firstly, Secondly) and a contrast linker (However).', 'Secondly, cities have better services.', array['Each paragraph has one clear topic'], array['Vary sequencing linkers beyond Firstly/Secondly']),
    ('crit_vocabulary_range', 'vocabulary_range', 13, 'Appropriate, mostly accurate vocabulary for the topic, though fairly general.', null, array['Correct use of ''job opportunities'', ''quality of services'''], array['Replace general words like ''good job'' with more precise phrases']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 13, 'Grammar is largely accurate with only minor slips.', null, array['Correct comparative structures throughout'], array['Combine some short sentences into more complex ones'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e2_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e2, (values
    (0, 30, 'There are many companies and factories', 'info', 'limited_range', 'Accurate but generic; naming a specific industry would strengthen the point.', 'Try: ''especially in technology and manufacturing''.', null)
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'B2', 'Free University Education — Meets Expectations B2 Response', 'Higher education fees have become a controversial topic in many countries. In my view, university education should be free for all students, as this would benefit both individuals and society as a whole.

One of the main arguments in favour of free education is equality of opportunity. When students have to pay high tuition fees, those from lower-income families are often discouraged from applying, regardless of their academic ability. Making university free would ensure that a person''s future is determined by their talent and effort, not their family''s income.

Moreover, a well-educated population benefits the whole economy. Graduates tend to have better-paid jobs, pay more taxes over their lifetime, and are less likely to rely on state benefits. In this sense, the initial cost of free education could be seen as a long-term investment rather than a simple expense.

On the other hand, critics argue that free education would put too much pressure on government budgets, potentially reducing funding for other public services. This is a fair concern, and it suggests that free education should be introduced gradually and be paid for through fairer taxation.

In conclusion, while funding remains a genuine challenge, I believe the long-term social and economic benefits of free university education outweigh the costs.',
    78, 'meets_expectations',
    array['Well-developed arguments with clear cause-effect reasoning','Balanced treatment of the counter-argument','Appropriate academic register'], array['Could use a wider variety of sentence openings','One or two ideas could be illustrated with a real-world example'], 'This response meets B2 expectations with well-organised, logically developed paragraphs and an appropriate academic tone. Adding a concrete real-world example (a country that already offers free tuition) would push it towards the strong band.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'The opinion is clearly stated and supported with two well-developed arguments plus a fair counter-argument.', 'university education should be free for all students, as this would benefit both individuals and society as a whole', array['Reasoning goes beyond the surface level (equality, then economic benefit)'], array['A specific example, e.g. Germany or Norway, would add concrete support']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Textbook opinion essay structure with a clear thesis, two supporting paragraphs, a counter-argument and a conclusion that restates the position.', null, array['Counter-argument paragraph is genuinely persuasive, not just token'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Strong cohesion with varied linking devices (Moreover, In this sense, On the other hand).', 'On the other hand, critics argue that free education would put too much pressure on government budgets', array['Smooth transitions between ideas'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of topic-specific and academic vocabulary used accurately.', null, array['''equality of opportunity'', ''long-term investment'' show precise word choice'], array['A few more varied sentence openers would improve flow']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 15, 'Grammar is accurate throughout, including more complex structures.', null, array['Accurate use of modals for hedging (would, could)'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e3_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e3, (values
    (0, 40, 'Higher education fees have become a controversial topic', 'info', 'collocation', 'Good natural collocation — used here as a positive example of accurate register.', null, null)
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'B2', 'Social Media: More Good Than Harm? — Strong B2 Response', 'Social media has transformed the way people communicate, and opinions about its overall impact remain sharply divided. Having weighed the evidence, I believe that social media does more good than harm, provided it is used responsibly.

The most obvious benefit is connectivity. Platforms such as Instagram and WhatsApp allow people to stay in touch with friends and relatives across the world instantly and at no cost, something that would have seemed extraordinary a generation ago. For migrants, students studying abroad, or families separated by work, this constant connection is invaluable.

Social media has also become a powerful tool for education and activism. Countless educational accounts share bite-sized lessons on everything from history to coding, making learning more accessible than ever. Likewise, movements for social change have used these platforms to organise and spread awareness far faster than traditional media could.

Admittedly, the negative effects cannot be ignored. Excessive use is linked to anxiety, poor sleep and reduced attention spans, particularly among teenagers. Nevertheless, these are largely problems of overuse rather than inherent flaws in the technology itself, and they can be addressed through education about healthy digital habits rather than avoidance.

In conclusion, when used in moderation and with awareness of its risks, social media offers benefits that clearly outweigh its drawbacks.',
    87, 'strong',
    array['Nuanced argument that avoids oversimplification','Sophisticated linking and paragraph structure','Precise, varied vocabulary'], array['The activism paragraph could include one specific named example'], 'A strong B2 response because it takes a genuinely nuanced position rather than a simple ''social media is good/bad'' stance, and supports it with varied, well-organised arguments and precise vocabulary.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'A clear, nuanced opinion is developed with strong, relevant supporting arguments.', 'I believe that social media does more good than harm, provided it is used responsibly', array['The qualifier ''provided it is used responsibly'' shows sophisticated reasoning'], array['Name a specific activism movement for extra precision']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Fully achieves the opinion essay genre with a persuasive but balanced tone throughout.', null, array['Concession paragraph strengthens rather than weakens the argument'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent cohesion with a wide range of linking devices used naturally.', 'Admittedly, the negative effects cannot be ignored. Nevertheless, these are largely problems of overuse', array['Concession-then-rebuttal structure is very effective'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of precise, natural vocabulary and collocations.', null, array['''bite-sized lessons'', ''inherent flaws'' show idiomatic precision'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Consistently accurate grammar with varied, complex sentence structures.', null, array['Confident use of participle clauses (''Having weighed the evidence'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'C1', 'Space Exploration vs. Earthly Problems — Strong C1 Response', 'As billions of dollars are funnelled into ambitious missions to Mars and beyond, a pressing question arises: should governments prioritise space exploration over addressing pressing problems here on Earth? While the allure of the cosmos is undeniable, I would argue that terrestrial challenges must take precedence, at least for now.

Proponents of space exploration often point to its long-term benefits: technological spin-offs, from satellite communication to medical imaging, have historically emerged from space research, and the search for extraterrestrial resources could eventually alleviate resource scarcity on Earth. These are legitimate considerations that should not be dismissed outright.

However, the scale of unresolved problems on our own planet demands more urgent attention. Climate change threatens to displace hundreds of millions of people within decades; extreme poverty still afflicts a significant proportion of the global population; and public health systems in many regions remain dangerously underfunded. Redirecting even a fraction of space budgets towards these issues could yield more immediate, tangible improvements to human welfare.

Critics might counter that space and Earth-based investment need not be mutually exclusive, and to a degree this is true. Yet given finite public resources, prioritisation is inevitable, and it is difficult to justify lavish spending on interplanetary ambition while preventable crises unfold at home.

Ultimately, space exploration should continue, but as a secondary priority. Only once we have made substantially greater progress in safeguarding life on Earth should it claim a larger share of public investment.',
    90, 'strong',
    array['Sophisticated concession-and-rebuttal structure','Precise, wide-ranging academic vocabulary','Nuanced final position rather than an absolute stance'], array['A specific statistic or source would strengthen the climate/poverty claims'], 'A strong C1 response that engages seriously with the opposing view before building a well-reasoned case, using precise academic vocabulary and complex sentence structures with full control.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Develops a nuanced, well-argued position that genuinely engages with the complexity of the issue.', 'terrestrial challenges must take precedence, at least for now', array['The qualifier ''at least for now'' avoids an oversimplified absolute claim'], array['Cite a specific statistic to strengthen the poverty/climate claims']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the register and structure expected of a C1 discursive opinion essay.', null, array['Rhetorical question in the introduction effectively frames the debate'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Ideas are developed logically with sophisticated cohesive devices throughout.', 'Critics might counter that space and Earth-based investment need not be mutually exclusive, and to a degree this is true.', array['Genuine engagement with counter-arguments rather than a token mention'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide range of precise, idiomatic academic vocabulary used with full control.', null, array['''funnelled into'', ''alleviate resource scarcity'' show sophisticated word choice'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammatical structures are used with confidence and accuracy.', null, array['Accurate use of inversion-style and conditional structures'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'opinion_essay', 'C2', 'Regulating Artificial Intelligence — Advanced C2 Response', 'The rapid proliferation of artificial intelligence systems capable of generating text, images and even autonomous decisions has outpaced the legal and ethical frameworks meant to govern them. The question of how far such regulation should extend is not merely technical but civilisational in scope, and I contend that robust, internationally coordinated regulation is not only advisable but essential.

The case for restraint rests largely on the fear of stifling innovation: excessive bureaucracy, critics warn, could drive research underground or offshore to jurisdictions with laxer standards, ultimately ceding technological leadership to less scrupulous actors. This concern is not without merit, and any regulatory framework must be calibrated to avoid such perverse incentives.

Nevertheless, the risks of an unregulated trajectory are considerably graver. Algorithmic bias embedded in opaque systems already perpetuates discrimination in hiring, lending and criminal sentencing, often invisibly. Autonomous weapons systems raise the spectre of warfare conducted with diminished human accountability. And the sheer scale at which misinformation can now be generated threatens the epistemic foundations of democratic discourse itself. These are not speculative harms confined to science fiction; they are documented and, in several cases, already unfolding.

What is required, then, is neither prohibition nor laissez-faire indifference, but a nuanced regulatory architecture: mandatory transparency for high-stakes algorithmic decisions, independent auditing mechanisms, and binding international agreements analogous to those governing nuclear proliferation. Innovation and accountability need not be adversarial; history suggests that well-designed regulation, from aviation safety to pharmaceuticals, has tended to entrench public trust rather than erode competitiveness.

In conclusion, the stakes of inaction are too consequential to leave AI development to market forces alone. Thoughtful, adaptive regulation offers the only credible path towards harnessing this technology''s benefits while containing its most serious risks.',
    96, 'advanced',
    array['Highly sophisticated argumentation with genuine engagement across multiple dimensions of the issue','Precise, wide-ranging vocabulary used with total control','Rhetorically effective structure with a memorable, non-absolutist resolution'], array[]::text[], 'An exemplary C2 response: the argument is genuinely sophisticated (not merely long), engaging with economic, ethical and geopolitical dimensions of the issue, and the language is precise, varied and completely controlled throughout.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 20, 'The response fully and originally addresses the task with a sophisticated, well-substantiated position.', 'robust, internationally coordinated regulation is not only advisable but essential', array['Genuinely engages with the strongest counter-argument before rebutting it'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful control of the discursive essay genre, including register and rhetorical structure.', null, array['The nuclear-proliferation analogy is a highly effective rhetorical device'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 20, 'Exceptionally well-organised with seamless, sophisticated cohesion throughout.', 'What is required, then, is neither prohibition nor laissez-faire indifference, but a nuanced regulatory architecture', array['The ''neither/nor... but'' structure elegantly resolves the earlier tension'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise and wide-ranging vocabulary used with complete accuracy.', null, array['''epistemic foundations'', ''perverse incentives'' show near-native lexical sophistication'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex sentence structures are handled with near-total accuracy.', null, array['Confident use of colons, semicolons and layered subordinate clauses'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e7 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'B1', 'Mobile Phones in School — Developing B1 Response', 'Many schools dont allow students to using mobile phone in school. I think this rule is wrong and phones must be allowed.

First, phone can help student to study. There is many apps for learning english or maths. If teacher say student can use phone for the lesson, it can be very useful tool.

Also, phone is important for safety. Parent want to contact they children if something happen. Without phone, student cannot call they parent in emergency.

Some people think phone make student distracted and they dont listen in class. This can be true but teacher can make rule about when use phone, like only in break time.

In conclusion, I believe phones should be allowed in school because it help for learning and for safety, but must have some rule.',
    52, 'developing',
    array['Clear position and two relevant reasons','Attempts to address a counter-argument'], array['Frequent grammar errors (verb forms, possessives)','Vocabulary is repetitive and general'], 'This response argues a clear position with relevant, if basic, reasons. Frequent errors with verb forms and possessive adjectives (''they'' instead of ''their'') are the main barrier to a higher score.'
  )
  returning id
),
e7_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e7, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'A position is argued with two reasons and a brief counter-argument, though development stays basic.', 'I think this rule is wrong and phones must be allowed.', array['Clear thesis stated early'], array['Add a specific example of a learning app or an emergency situation']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Basic argumentative structure with reasons and a counter-argument, appropriate for the level.', null, array['Attempts to persuade rather than just describe'], array['Strengthen the rebuttal of the counter-argument']),
    ('crit_organisation_cohesion', 'organisation_cohesion', 11, 'Simple linking words (First, Also, In conclusion) organise the ideas adequately.', 'First, phone can help student to study.', array['One idea per paragraph'], array['Use linkers beyond First/Also']),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Vocabulary is basic and ''phone'' is repeated without variation.', null, array['Correct use of ''distracted'', ''emergency'''], array['Try ''mobile devices'' or ''smartphones'' as alternatives']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 10, 'Frequent errors with possessive adjectives, plurals and verb forms reduce accuracy.', 'Parent want to contact they children if something happen.', array[]::text[], array['Review possessive adjectives: ''their'' not ''they''','Review third person ''-s'' in present simple'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e7_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e7, (values
    (0, 40, 'Parent want to contact they children', 'mistake', 'pronouns', '''Their'' (possessive) is needed, not the subject pronoun ''they''.', 'Use ''their'' before a noun to show possession.', 'Parents want to contact their children'),
    (0, 45, 'student cannot call they parent in emergency', 'mistake', 'pronouns', 'Same error repeated: ''their'' is the correct possessive form.', null, 'a student cannot call their parents in an emergency')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e8 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'B1', 'Should Homework Be Banned? — Meets Expectations B1 Response', 'Homework is a normal part of school life, but some people think it should be banned completely. In this essay, I will argue that homework should not be banned, although the amount should be reduced.

Firstly, homework helps students to practise what they learned in class. Without homework, students might forget the lesson quickly. Doing exercises at home gives them a chance to check if they really understood the topic.

Secondly, homework teaches students to be responsible. They must organise their own time and finish the task without a teacher watching them. This is an important skill for later life, for example at university or at work.

On the other hand, too much homework can cause stress and leave no time for hobbies or rest. This is a real problem, especially for younger students. For this reason, teachers should give a reasonable amount, not hours of homework every night.

In conclusion, homework should not be banned because it helps learning and responsibility, but schools need to be careful about how much they give.',
    70, 'meets_expectations',
    array['Clear thesis with a reasonable middle-ground position','Good paragraph organisation with topic sentences'], array['Could use more specific examples','Some repetition of ''homework'' without synonyms'], 'A well-organised B1 response that avoids an extreme position and instead argues for moderation, which is a mature argumentative move. More specific examples would raise the score further.'
  )
  returning id
),
e8_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e8, (values
    ('crit_task_fulfilment', 'task_fulfilment', 14, 'A clear, reasoned position is argued with two solid reasons and a fair counter-argument.', 'homework should not be banned, although the amount should be reduced', array['Nuanced middle-ground thesis rather than an all-or-nothing stance'], array['Add a concrete example, e.g. a specific subject or age group']),
    ('crit_genre_achievement', 'genre_achievement', 14, 'Solid argumentative essay structure with thesis, two body paragraphs, counter-argument and conclusion.', null, array['Conclusion connects the two body paragraphs together'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 14, 'Good use of linking devices (Firstly, Secondly, On the other hand, For this reason).', 'On the other hand, too much homework can cause stress', array['Clear paragraph-level organisation'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 13, 'Adequate range with correct use of some topic-specific phrases.', null, array['''organise their own time'' is a natural collocation'], array['Reduce repetition of ''homework''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 15, 'Grammar is accurate throughout with only very minor issues.', null, array['Accurate modal verbs (should, might, must)'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e9 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'B2', 'Should Zoos Be Closed? — Meets Expectations B2 Response', 'Zoos have existed for centuries, but in recent years an increasing number of people have questioned whether keeping animals in captivity can ever be justified. I will argue that, despite valid ethical concerns, well-managed zoos should not be closed, because of the important conservation role they play.

Opponents of zoos rightly point out that many enclosures fail to replicate an animal''s natural habitat, leading to stress and abnormal behaviour. This is a legitimate criticism, and poorly run zoos deserve strong regulation or closure.

However, reputable zoos contribute significantly to conservation. Breeding programmes have helped bring several species, such as the Arabian oryx, back from the brink of extinction, and reintroduction into the wild would have been far more difficult without these controlled environments. In addition, zoos fund research and provide veterinary knowledge that benefits wild populations too.

Furthermore, zoos play an educational role that is easy to underestimate. Many children develop a lasting interest in wildlife conservation after visiting a zoo, an experience that could inspire the next generation of scientists and conservationists.

In conclusion, while poorly managed zoos should face stricter regulation, closing all zoos would eliminate an institution that, when run responsibly, makes a genuine contribution to conservation and public education.',
    80, 'meets_expectations',
    array['Engages seriously with the opposing view before countering it','Specific supporting example (Arabian oryx)','Clear, logical paragraph structure'], array['The educational-role paragraph could be developed with more evidence'], 'This response meets B2 expectations well: it takes the counter-argument seriously rather than dismissing it, and supports its case with a specific example. Slightly more development in the final body paragraph would push it towards strong.'
  )
  returning id
),
e9_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e9, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'A clear position is argued with well-developed, specific reasoning.', 'well-managed zoos should not be closed, because of the important conservation role they play', array['Named example (Arabian oryx) adds real credibility'], array['Develop the educational-role paragraph with a statistic or study']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Strong argumentative structure with genuine engagement with the counter-argument.', null, array['Opens with a concession before pivoting to the main argument'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Well-organised with a clear line of argument and appropriate linking devices.', 'Furthermore, zoos play an educational role that is easy to underestimate.', array['Logical progression from ethics to conservation to education'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of topic-specific vocabulary used accurately.', null, array['''brink of extinction'', ''reintroduction into the wild'' show precise topic vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate with a good range of complex structures.', null, array['Accurate conditional structure in paragraph two'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e10 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'B2', 'Lowering the Voting Age to 16 — Strong B2 Response', 'The question of whether the voting age should be lowered to sixteen has sparked debate in many democracies. I would argue strongly in favour of this change, as it would strengthen rather than weaken the democratic process.

Critics often claim that sixteen-year-olds lack the maturity and life experience to make informed political decisions. Yet this argument assumes that older voters are inherently better informed, which is not supported by evidence; political knowledge varies enormously within every age group, not just among teenagers. If maturity were truly the criterion for voting rights, we would need a far more rigorous test than simply reaching eighteen.

Moreover, sixteen-year-olds are already trusted with significant responsibilities: in many countries, they can work, pay taxes and, in some cases, join the armed forces. It seems inconsistent to grant these responsibilities while denying a say in the government whose policies directly affect them, from education funding to climate legislation.

Finally, engaging young people in politics earlier tends to build lifelong civic habits. Countries such as Austria, where the voting age is already sixteen, have reported healthy turnout among young voters, suggesting that early enfranchisement encourages rather than discourages participation.

In conclusion, lowering the voting age would extend a fundamental democratic right to citizens who are already old enough to bear real responsibilities, and evidence suggests it would strengthen democratic engagement rather than undermine it.',
    88, 'strong',
    array['Directly refutes the counter-argument with reasoning, not just assertion','Real-world example (Austria) adds credibility','Sophisticated linking and sentence variety'], array['A specific turnout statistic for Austria would make the final argument even stronger'], 'A strong B2 response because the writer doesn''t just mention the counter-argument but actively dismantles it with logic, and supports the case with a real, verifiable example.'
  )
  returning id
),
e10_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e10, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'The argument is fully developed and directly rebuts the strongest counter-argument.', 'this argument assumes that older voters are inherently better informed, which is not supported by evidence', array['Genuine logical rebuttal rather than dismissal'], array['Cite an actual turnout percentage for Austria']),
    ('crit_genre_achievement', 'genre_achievement', 17, 'Fully achieves the persuasive argumentative register expected at this level.', null, array['Confident, assertive opening stance'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 17, 'Very well organised with sophisticated, varied linking devices.', 'Moreover, sixteen-year-olds are already trusted with significant responsibilities', array['Each paragraph builds on the previous one logically'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Wide range of precise vocabulary used naturally.', null, array['''enfranchisement'', ''civic habits'' show sophisticated topic vocabulary'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Accurate, varied and complex grammar throughout.', null, array['Confident use of conditional and comparative structures'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e11 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'C1', 'Customer Data and Advertising — Strong C1 Response', 'Few aspects of modern commerce generate as much unease as the practice of harvesting customer data for targeted advertising. Companies routinely track browsing habits, purchase history and even location data to construct detailed behavioural profiles. I contend that this practice, in its current largely unregulated form, does more harm than good and should be significantly curtailed.

Defenders of targeted advertising argue that it benefits consumers by surfacing more relevant products and, crucially, subsidises free digital services that would otherwise require direct payment. There is some truth to this: a certain degree of personalisation genuinely improves user experience, and few would want to return to an internet funded entirely by intrusive, irrelevant advertising.

Nevertheless, the scale and opacity of contemporary data collection go far beyond reasonable personalisation. Users rarely understand, let alone consent to, the full extent of the data trail they generate, and this asymmetry of information creates a troubling power imbalance between corporations and individuals. Moreover, the same profiling techniques used to sell products can be repurposed for political manipulation, as demonstrated by several well-documented scandals involving microtargeted disinformation.

A middle path exists, however: rather than banning targeted advertising outright, robust regulation requiring genuine, comprehensible consent and strict limits on data retention could preserve its legitimate benefits while curbing its worst excesses. The European Union''s data protection framework, whatever its imperfections, demonstrates that such regulation is practically achievable.

In conclusion, unregulated data harvesting for advertising purposes poses risks to individual autonomy and democratic discourse that outweigh its commercial convenience, and meaningful regulation, rather than prohibition, offers the most credible way forward.',
    91, 'strong',
    array['Sophisticated concession-and-refutation structure','Real-world grounding (EU data protection framework)','Precise, wide-ranging vocabulary with full control'], array['Could name a specific microtargeting scandal for added precision'], 'A strong C1 response: the writer grants real weight to the opposing argument before building a sophisticated, well-evidenced case for regulation rather than prohibition — a genuinely nuanced conclusion.'
  )
  returning id
),
e11_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e11, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'A sophisticated, well-substantiated argument that reaches a genuinely nuanced conclusion.', 'robust regulation... could preserve its legitimate benefits while curbing its worst excesses', array['Proposes a concrete middle-path solution rather than a binary stance'], array['Name a specific documented scandal for extra precision']),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the C1 discursive/argumentative register with a persuasive but measured tone.', null, array['The EU reference grounds the argument in real policy'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent logical progression with sophisticated cohesive devices.', 'Nevertheless, the scale and opacity of contemporary data collection go far beyond reasonable personalisation.', array['Concession-rebuttal-solution structure is highly effective'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Wide range of precise, topic-specific and academic vocabulary.', null, array['''asymmetry of information'', ''curtailed'' show sophisticated lexical control'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Complex grammar handled with confidence and near-total accuracy.', null, array['Effective use of cleft structures for emphasis'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e12 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'argumentative_essay', 'C2', 'Genetic Engineering of Human Embryos — Advanced C2 Response', 'The advent of precise gene-editing technologies such as CRISPR has transformed what was once speculative bioethics into an urgent, practical policy question: should the genetic engineering of human embryos be permitted, and if so, within what limits? I argue that a narrowly circumscribed permission, restricted to the elimination of severe hereditary disease, is both ethically defensible and practically necessary, whereas broader applications aimed at enhancement should remain prohibited.

The case against any embryonic editing typically rests on two pillars: the risk of unforeseen biological consequences, given how imperfectly we understand the interactions between genes, and the spectre of a stratified society in which genetic advantage becomes a purchasable commodity, exacerbating existing inequality. Both concerns are substantive and must inform any regulatory framework rather than being waved away.

Yet a blanket prohibition conflates two categorically distinct interventions. Editing to prevent a child from inheriting a devastating, well-understood monogenic disorder, such as Huntington''s disease, is a fundamentally different act from editing to select for height, intelligence or eye colour. The former targets a clearly defined pathology with a proportionate, medically justified intervention; the latter opens the door to a eugenics-adjacent logic that society has, for good historical reason, resolved to resist.

A workable regulatory architecture, therefore, would draw this line explicitly: permitting embryonic editing only for a defined, continually reviewed list of severe monogenic conditions, subject to rigorous clinical oversight, international reporting requirements, and an absolute prohibition on non-therapeutic enhancement. Existing precedents, such as the strict licensing regime governing IVF and embryo research in the United Kingdom, demonstrate that such carefully bounded permission is administratively feasible.

In conclusion, the moral urgency of preventing severe hereditary suffering, weighed against the containable risks of a tightly regulated therapeutic exception, justifies permitting genetic editing for disease elimination, provided society remains vigilant in policing the boundary between therapy and enhancement.',
    95, 'advanced',
    array['Draws a sophisticated, ethically grounded distinction rather than a binary yes/no','Real-world regulatory precedent (UK licensing regime) grounds the argument','Exceptional control of complex academic register and structure'], array[]::text[], 'An outstanding C2 response: rather than a simple for/against structure, the writer draws a precise, defensible distinction (therapy vs. enhancement) and builds a genuinely persuasive regulatory proposal around it, with flawless control of academic register.'
  )
  returning id
),
e12_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e12, (values
    ('crit_task_fulfilment', 'task_fulfilment', 20, 'An exceptionally sophisticated, precisely argued position that goes well beyond a simple binary stance.', 'a narrowly circumscribed permission, restricted to the elimination of severe hereditary disease, is both ethically defensible and practically necessary', array['The therapy/enhancement distinction is the intellectual core of a genuinely strong argument'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 19, 'Masterful command of the argumentative essay genre at the highest level.', null, array['UK licensing precedent grounds an abstract argument in practical reality'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 19, 'Impeccable organisation with a clear, sophisticated line of reasoning from problem to proposal.', 'A workable regulatory architecture, therefore, would draw this line explicitly', array['Each paragraph builds precisely on the previous one''s logic'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 19, 'Exceptionally precise, specialised vocabulary used with complete control.', null, array['''monogenic disorder'', ''eugenics-adjacent logic'' show genuine subject-matter fluency'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Highly complex structures handled with near-total accuracy throughout.', null, array['Confident, varied use of subordination and parallel structure'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;