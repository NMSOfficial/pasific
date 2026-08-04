-- Pasific Library batch 5: original examples for informal_email and
-- complaint_letter, spanning B1-C1 across developing/meets/strong bands.
-- Written from scratch for Pasific to match the app's rubric-criterion and
-- annotation schema exactly.

with
e1 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'informal_email', 'B1', 'Weekend Plans — Developing B1 Response', 'Hi Sam,

How are you? I hope you good. I am writing because I want to ask you something about this weekend.

My cousin is coming to visit and I want to show her the city. Maybe we can go to the new cafe near the park, the one with the good cake! Do you want to come with us on Saturday?

Also, do you know any good place for take photo? My cousin loves take photo for her instagram.

Write back soon and tell me if you free!

See you soon,
Ayşe',
    48, 'developing',
    array['Friendly, appropriately informal tone throughout','Clear invitation with a specific plan'], array['Missing ''to be'' and gerund forms in several places','Frequent small grammar slips typical of this level'], 'The email has a genuinely friendly, informal tone appropriate to the genre, but missing verb forms (''I hope you are good'', ''for taking photos'') keep it at a developing level.'
  )
  returning id
),
e1_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e1, (values
    ('crit_task_fulfilment', 'task_fulfilment', 10, 'A clear invitation and a specific question are both included.', 'Do you want to come with us on Saturday?', array['Clear, specific invitation'], array['Suggest a specific time to meet']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Appropriately informal register and structure throughout, matching the genre well.', 'Hi Sam, ... See you soon, Ayşe', array['Correct informal greeting and sign-off'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Ideas are organised into short, clear paragraphs typical of informal email.', null, array['Each paragraph covers one topic'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate everyday vocabulary for the genre.', null, array['Natural informal phrases like ''the one with the good cake'''], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 8, 'Frequent errors with ''to be'' omission and gerund forms after prepositions.', 'I hope you good', array[]::text[], array['Review ''to be'' in statements (''you are good'')','Review gerund forms after ''for'' and after ''loves'''])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e1_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e1, (values
    (0, 20, 'I hope you good', 'mistake', 'auxiliary_verbs', 'The verb ''are'' (a form of ''to be'') is missing between ''you'' and ''good''.', null, 'I hope you are well'),
    (0, 40, 'My cousin loves take photo for her instagram', 'mistake', 'verb_tense', '''Loves'' should be followed by the ''-ing'' form: ''loves taking photos''.', '''Love'' is usually followed by a gerund (-ing) or ''to'' + infinitive.', 'My cousin loves taking photos for her Instagram')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e2 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'informal_email', 'B2', 'Telling a Friend About a New Job — Meets Expectations B2 Response', 'Hey Marco,

I hope everything''s going well with you! I''ve got some exciting news — I finally started my new job at the marketing agency last week, and so far it''s going really well.

The team is super friendly, and my manager has been really supportive about helping me settle in. The work itself is quite different from what I was doing before, but I''m enjoying the challenge, especially working on the social media side of things.

The only downside is that the commute is pretty long, about 50 minutes each way, so I''m still trying to figure out the best way to use that time productively (probably podcasts!).

Anyway, we should catch up properly soon — maybe grab a coffee this weekend if you''re free? Let me know what works for you.

Take care,
Leo',
    76, 'meets_expectations',
    array['Natural, genuinely conversational tone throughout','Good balance of positive and negative details, making it feel authentic'], array['Could ask Marco a question about his own life earlier in the email'], 'A natural, well-paced informal email that reads like genuine correspondence rather than a formal exercise, with a good mix of positive news and a minor honest complaint.'
  )
  returning id
),
e2_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e2, (values
    ('crit_task_fulfilment', 'task_fulfilment', 15, 'The news is shared with relevant detail and the email ends with a genuine social invitation.', 'maybe grab a coffee this weekend if you''re free?', array['Natural mix of good news and a minor complaint'], array['Ask about Marco''s life earlier in the email']),
    ('crit_genre_achievement', 'genre_achievement', 15, 'Genuinely natural, conversational register throughout, well matched to the genre.', 'I''ve got some exciting news', array['Uses contractions and informal phrasing naturally'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 15, 'Well-organised with a natural flow from news to detail to invitation.', 'Anyway, we should catch up properly soon', array['''Anyway'' naturally signals the shift to closing'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 15, 'Good range of natural informal vocabulary and idiom.', null, array['''settle in'', ''the only downside is'' show natural idiomatic use'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 16, 'Grammar is accurate throughout, including natural use of contractions.', null, array['Confident, natural use of present perfect for recent news'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e3 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'informal_email', 'C1', 'Advice About Moving Abroad — Strong C1 Response', 'Hey Priya,

I''ve been mulling over what you told me on the phone, and I wanted to put my thoughts in writing so you''ve got something to come back to when you''re weighing things up.

First off, I completely get why the Berlin offer is tempting — better pay, a genuinely exciting role, and let''s be honest, a change of scenery sounds appealing after the year you''ve had. That said, I don''t think you should underestimate how disruptive the first six months abroad can be, even somewhere as expat-friendly as Berlin. It took me the better part of a year to feel properly settled when I moved, and I had it relatively easy with a company that sorted out most of the admin for me.

What I''d actually push you to think about isn''t the job itself, but what kind of life you want alongside it. Would you have the kind of support network you rely on here? Is there room to build one from scratch if not? None of this means you shouldn''t go — honestly, my gut says you probably should — but I''d want you to go in with your eyes open rather than swept up in how good the offer looks on paper.

Anyway, let''s talk properly this weekend if you''re free — this isn''t really a decision to make over text.

Speak soon,
Jonas',
    89, 'strong',
    array['Genuinely natural, warm register with sophisticated but unforced vocabulary','Gives real, considered advice rather than generic reassurance','Skilfully balances honesty with support'], array[]::text[], 'A strong C1 response because it reads as genuine, thoughtful correspondence between close friends — the advice is specific and honest rather than generic, and the register never slips into being either too casual or too stiff.'
  )
  returning id
),
e3_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e3, (values
    ('crit_task_fulfilment', 'task_fulfilment', 18, 'Genuinely specific, considered advice is given rather than generic reassurance.', 'I''d want you to go in with your eyes open rather than swept up in how good the offer looks on paper', array['Advice is honest and specific, not just supportive platitudes'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Masterfully natural informal register throughout — reads as genuine correspondence.', 'let''s be honest, a change of scenery sounds appealing', array['Never slips into an overly formal or stilted register despite sophisticated content'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent natural flow from empathy to honest challenge to practical next step.', 'What I''d actually push you to think about isn''t the job itself, but what kind of life you want alongside it.', array['Rhetorical questions used naturally to prompt reflection'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 17, 'Sophisticated vocabulary and idiom used with complete naturalness.', null, array['''mulling over'', ''swept up in'' show genuinely idiomatic, natural language'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex, natural grammar handled with complete confidence throughout.', null, array['Confident use of hedging and modal structures throughout'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e4 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'complaint_letter', 'B1', 'Broken Headphones — Developing B1 Response', 'Dear Sir or Madam,

I am writing to complain about a product I buy from your website last week. I order a pair of headphones but when it arrive, it dont work.

I open the box carefully and connect the headphones to my phone, but there is no sound at all. I think the product is broken before I even use it.

I want you to send me a new one or give me my money back. I attach the receipt with this letter.

I hope you can solve this problem quickly because I am not happy with this experience.

Yours faithfully,
Mert Demir',
    50, 'developing',
    array['Clear statement of the problem with relevant detail','Specific, reasonable resolution requested (replacement or refund)'], array['Frequent past tense errors (''buy'' instead of ''bought'')','Subject-verb agreement errors (''it dont work'')'], 'The letter clearly states the problem and requests a specific resolution, but frequent past tense and agreement errors keep it at a developing level.'
  )
  returning id
),
e4_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e4, (values
    ('crit_task_fulfilment', 'task_fulfilment', 11, 'The problem is clearly described and a specific resolution is requested.', 'I want you to send me a new one or give me my money back.', array['Clear, specific desired outcome'], array['Include the order number for reference']),
    ('crit_genre_achievement', 'genre_achievement', 11, 'Follows the complaint letter structure with appropriate formal opening and closing.', 'Dear Sir or Madam, ... Yours faithfully,', array['Correct formal greeting matched to closing'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 10, 'Clear paragraph structure moving from problem to evidence to request.', null, array['Logical order: problem, detail, request'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 9, 'Basic but appropriate vocabulary for the complaint genre.', null, array['Correct use of ''complain'', ''receipt'''], array['Try ''faulty'' or ''defective'' instead of just ''broken''']),
    ('crit_grammar_mechanics', 'grammar_mechanics', 9, 'Frequent errors with past tense forms and subject-verb agreement.', 'a product I buy from your website last week', array[]::text[], array['Review past simple forms (''bought'', not ''buy'') with time markers like ''last week''','Review ''doesn''t'' with third person singular'])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
),
e4_ann as (
  insert into example_annotations (example_id, start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
  select id, v.start_pos, v.end_pos, v.quoted_text, v.severity, v.category_id, v.explanation, v.hint, v.suggested_correction
  from e4, (values
    (0, 45, 'a product I buy from your website last week', 'mistake', 'verb_tense', '''Last week'' signals the past simple, so ''bought'' is needed, not the base form ''buy''.', null, 'a product I bought from your website last week'),
    (0, 35, 'when it arrive, it dont work', 'mistake', 'subject_verb_agreement', '''It'' (singular) needs ''-s'': ''arrives'' and ''doesn''t work''.', 'Third person singular subjects (he/she/it) take ''-s'' in the present simple.', 'when it arrived, it didn''t work')
  ) as v(start_pos, end_pos, quoted_text, severity, category_id, explanation, hint, suggested_correction)
)
,
e5 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'complaint_letter', 'B2', 'Poor Service at a Restaurant — Meets Expectations B2 Response', 'Dear Manager,

I am writing to express my dissatisfaction with the service I received at your restaurant last Saturday evening, 14 June, during a birthday celebration for six people.

Although we had booked a table in advance for 7:30 pm, we were not seated until almost 8:15 pm, with no explanation or apology offered by staff. Once seated, our order took over 45 minutes to arrive, and two of the dishes were incorrect, requiring them to be sent back and re-prepared.

While I understand that busy periods can occasionally cause delays, the lack of communication throughout the evening was, in my opinion, unacceptable, particularly given that this was a special occasion. As a result, our overall experience was considerably diminished.

I would appreciate it if you could look into this matter and let me know what steps will be taken to prevent similar issues in future. I would also welcome your comments regarding possible compensation for the inconvenience caused.

I look forward to your response.

Yours sincerely,
Sophie Bennett',
    82, 'meets_expectations',
    array['Specific, well-sequenced details that make the complaint credible','Appropriately firm but professional tone throughout','Clear, reasonable request for both explanation and compensation'], array['Could specify a concrete compensation expectation rather than leaving it fully open'], 'This response meets B2 expectations well, with a clear chronological account of events and a professional, firm-but-polite tone that makes the complaint feel credible and reasonable.'
  )
  returning id
),
e5_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e5, (values
    ('crit_task_fulfilment', 'task_fulfilment', 16, 'The complaint is specific, well-evidenced and includes a clear, reasonable request.', 'two of the dishes were incorrect, requiring them to be sent back and re-prepared', array['Specific, credible chronology of events'], array['Suggest a specific form of compensation']),
    ('crit_genre_achievement', 'genre_achievement', 16, 'Appropriately firm but professional register throughout, well matched to the genre.', null, array['Balances firmness with professionalism effectively'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 16, 'Clear chronological organisation with appropriate linking devices.', 'While I understand that busy periods can occasionally cause delays', array['Logical progression from events to evaluation to request'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 16, 'Good range of precise, formal vocabulary appropriate to the genre.', null, array['''considerably diminished'', ''look into this matter'' show accurate formal register'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 17, 'Grammar is accurate throughout with a good range of complex structures.', null, array['Accurate use of passive voice (''were not seated'', ''requiring them to be sent back'')'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)
,
e6 as (
  insert into writing_examples (writing_type_id, level, title, text, overall_score, performance_band, strong_points, weak_points, teacher_explanation)
  values (
    'complaint_letter', 'C1', 'Defective Goods and Refund Request — Strong C1 Response', 'Dear Customer Service Team,

I am writing to formally lodge a complaint regarding a laptop (Order #48291) purchased from your online store on 3 March, which has proven to be defective, and to request a full refund in accordance with your stated returns policy.

Within the first week of use, the laptop began experiencing intermittent shutdowns, occurring at unpredictable intervals regardless of the application in use. I contacted your technical support team on 10 March, and although a representative attempted several troubleshooting steps over the phone, the issue persisted unresolved. A subsequent visit to an authorised repair centre confirmed a fault with the internal cooling system, which the technician indicated was a manufacturing defect rather than a result of misuse.

Given that the device was faulty from the outset, and considering the inconvenience this has caused, both in terms of lost productivity and the time invested in seeking a resolution, I do not consider a repair to be a satisfactory outcome. I would therefore request a full refund of £1,240, the amount originally paid, rather than a replacement or repair.

I have enclosed copies of the original receipt, the technical support correspondence, and the repair centre''s diagnostic report to support this claim. I trust this matter can be resolved promptly and would appreciate confirmation of the refund process within the next ten working days.

Yours faithfully,
Elena Petrova',
    94, 'strong',
    array['Highly professional, precisely evidenced complaint with a clearly justified specific request','Sophisticated, controlled formal register throughout','Well-organised chronological account with supporting documentation referenced'], array[]::text[], 'A strong C1 response: the complaint is built methodically from specific evidence to a precisely justified request, referencing supporting documentation in a way that makes the claim genuinely difficult to dispute.'
  )
  returning id
),
e6_scores as (
  insert into example_criterion_scores (example_id, criterion_id, criterion_key, ai_score, max_score, weight, explanation, evidence_quote, strong_aspects, development_areas)
  select id, v.criterion_id, v.criterion_key, v.ai_score, 20, 20, v.explanation, v.evidence_quote, v.strong_aspects, v.development_areas
  from e6, (values
    ('crit_task_fulfilment', 'task_fulfilment', 19, 'The complaint is precisely evidenced and the request is specific and clearly justified.', 'I would therefore request a full refund of £1,240, the amount originally paid, rather than a replacement or repair', array['Specific figure and explicit reasoning for rejecting alternative remedies'], array[]::text[]),
    ('crit_genre_achievement', 'genre_achievement', 18, 'Fully achieves the highly professional register expected of a formal complaint at this level.', null, array['References to enclosed documentation strengthen credibility'], array[]::text[]),
    ('crit_organisation_cohesion', 'organisation_cohesion', 18, 'Excellent chronological and logical organisation from problem to evidence to request.', 'Given that the device was faulty from the outset, and considering the inconvenience this has caused', array['Clear cause-and-effect reasoning leading to the request'], array[]::text[]),
    ('crit_vocabulary_range', 'vocabulary_range', 18, 'Precise, professional vocabulary used with complete confidence throughout.', null, array['''formally lodge a complaint'', ''in accordance with your stated returns policy'' show sophisticated formal register'], array[]::text[]),
    ('crit_grammar_mechanics', 'grammar_mechanics', 18, 'Complex grammar handled with confidence and near-total accuracy.', null, array['Confident use of subordination and passive constructions'], array[]::text[])
  ) as v(criterion_id, criterion_key, ai_score, explanation, evidence_quote, strong_aspects, development_areas)
)

select 1;