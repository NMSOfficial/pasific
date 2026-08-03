import type { Submission } from '../types/entities';

export const SUBMISSIONS: Submission[] = [
  // Assignment: Social Media (class 10a) — full result, visible score, no override
  {
    id: 'sub_ada_social_media',
    assignmentId: 'assignment_social_media',
    isPractice: false,
    studentId: 'student_ada_koc',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'for_and_against_essay',
    level: 'B2',
    topicTitle: 'Social Media: Help or Harm?',
    text: `Nowadays, most teenagers spend several hours a day on social media. While some people think this is mostly harmful, others believe it brings real benefits. This essay will consider both sides before giving my opinion.

On one hand, social media can damage teenagers' mental health. Constantly seeing edited photos of other people's lives can make young users feel like their own lives are less exciting or attractive. On the other hand, social media helps teenagers stay connected with friends who live far away, and many students use it to follow educational content that supports their learning.

In my opinion, the effect of social media depends mostly on how it is used rather than the platform itself. If schools teach digital literacy, students can enjoy the benefits while avoiding the most common risks.`,
    wordCount: 156,
    status: 'result_ready',
    submittedAt: '2026-07-28T20:14:00+03:00',
    lastSavedAt: '2026-07-28T20:14:00+03:00',
    finalScore: 84,
    aiScore: 84,
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Both views are addressed and a clear personal opinion is given.', evidenceQuote: 'In my opinion, the effect of social media depends mostly on how it is used rather than the platform itself.', strongAspects: ['Clear final position', 'Balanced coverage of both sides'], developmentAreas: ['A second specific example would strengthen the argument further'] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Neutral tone maintained until the conclusion, matching the for-and-against genre.', strongAspects: ['Appropriate register throughout'], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Clear paragraph structure with accurate contrast linking.', evidenceQuote: 'On the other hand, social media helps teenagers stay connected with friends who live far away.', strongAspects: ['Effective use of "on one hand / on the other hand"'], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 16, maxScore: 20, weight: 20, explanation: 'Good topic vocabulary with minor repetition of "social media".', strongAspects: ['Natural phrase: "digital literacy"'], developmentAreas: ['Vary references to "social media" using pronouns or synonyms'] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Accurate grammar with varied sentence structures, including an accurate conditional.', strongAspects: ['Accurate first conditional in the final paragraph'], developmentAreas: [] },
    ],
    annotations: [
      { id: 'ann_ada_1', start: 0, end: 0, quotedText: 'social media', severity: 'info', categoryId: 'repetition', explanation: 'This phrase is repeated six times across the essay.', hint: 'Try "these platforms" or "this kind of technology" in some places.' },
    ],
    studyRecommendations: [
      { id: 'rec_ada_1', topicKey: 'errorCategory.repetition', reasonKey: 'studyRec.repetitionReason', studentExampleQuote: 'social media … social media … social media', explanationKey: 'studyRec.repetitionExplanation', relatedLessonKey: 'studyRec.lesson.synonymRange', relatedExerciseKey: 'studyRec.exercise.synonymSwap', estimatedMinutes: 10, errorCategoryId: 'repetition' },
    ],
    teacherOverrides: [],
    teacherFeedback: 'Really balanced essay, Ada — your conclusion is genuinely your own opinion, not a summary. Next step: vary your vocabulary a little more.',
    reviewedBy: 'teacher_elif_yilmaz',
    reviewedAt: '2026-07-29T10:00:00+03:00',
  },
  // Assignment: Social Media — teacher overrode the AI score
  {
    id: 'sub_baris_social_media',
    assignmentId: 'assignment_social_media',
    isPractice: false,
    studentId: 'student_baris_ozturk',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'for_and_against_essay',
    level: 'B2',
    topicTitle: 'Social Media: Help or Harm?',
    text: `Today many teenager use social media a lot. Some people think it is bad but other people think it is good. I will talk about both.

Social media is bad because teenager compare themself with other and feel sad. Also they lose time that they can use for study. But social media is good too because you can talk with friend and family who is far away. You can also learn new things from video and pages about school subject.

I think social media have good side and bad side. It depend how much time you use it. If you use it too much it become bad for you.`,
    wordCount: 128,
    status: 'result_ready',
    submittedAt: '2026-07-29T19:30:00+03:00',
    lastSavedAt: '2026-07-29T19:30:00+03:00',
    finalScore: 80,
    aiScore: 74,
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 15, maxScore: 20, teacherScore: 16, weight: 20, explanation: 'Both sides are covered, but development is fairly general.', strongAspects: ['A clear opinion is stated'], developmentAreas: ['Add one specific example for each side'] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 15, maxScore: 20, weight: 20, explanation: 'Follows the for-and-against structure adequately.', strongAspects: [], developmentAreas: ['Keep a fully neutral tone until the conclusion'] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 15, maxScore: 20, teacherScore: 16, weight: 20, explanation: 'Paragraphing works but linking is repetitive ("but", "also").', strongAspects: ['Clear paragraph for each side'], developmentAreas: ['Use a wider range of linking devices'] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Basic but generally appropriate vocabulary for the topic.', strongAspects: [], developmentAreas: ['"talk with friend" → "keep in touch with friends"'] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 15, maxScore: 20, teacherScore: 17, weight: 20, explanation: 'Several agreement and plural-form errors, but meaning stays clear throughout.', evidenceQuote: 'teenager compare themself with other and feel sad', strongAspects: [], developmentAreas: ['Review subject–verb agreement and plural nouns'] },
    ],
    annotations: [
      { id: 'ann_baris_1', start: 0, end: 0, quotedText: 'teenager compare themself with other', severity: 'mistake', categoryId: 'subject_verb_agreement', explanation: '"Teenager" needs a plural form here, and the verb should agree with a plural subject.', suggestedCorrection: 'teenagers compare themselves with others' },
      { id: 'ann_baris_2', start: 0, end: 0, quotedText: 'friend and family who is far away', severity: 'mistake', categoryId: 'subject_verb_agreement', explanation: '"Friend and family" is a plural subject, so it needs "who are", not "who is".', suggestedCorrection: 'friends and family who are far away' },
      { id: 'ann_baris_3', start: 0, end: 0, quotedText: 'It depend how much time', severity: 'critical', categoryId: 'subject_verb_agreement', explanation: 'Missing third-person "-s": this changes the reader\'s impression of basic grammatical control in a key sentence of the conclusion.', suggestedCorrection: 'It depends on how much time' },
    ],
    studyRecommendations: [
      { id: 'rec_baris_1', topicKey: 'errorCategory.subject_verb_agreement', reasonKey: 'studyRec.svaReason', reasonParams: { count: 3 }, studentExampleQuote: 'It depend how much time you use it.', explanationKey: 'studyRec.svaExplanation', relatedLessonKey: 'studyRec.lesson.sva', relatedExerciseKey: 'studyRec.exercise.svaEightQuestions', estimatedMinutes: 12, errorCategoryId: 'subject_verb_agreement' },
    ],
    teacherOverrides: [
      { id: 'override_baris_1', submissionId: 'sub_baris_social_media', criterionId: 'crit_task_fulfilment', originalAiScore: 15, finalScore: 16, reason: 'The two-sided structure is actually a bit stronger than the AI scored — both risks and benefits are genuinely developed, not just listed.', teacherId: 'teacher_elif_yilmaz', timestamp: '2026-07-30T11:15:00+03:00' },
      { id: 'override_baris_2', submissionId: 'sub_baris_social_media', criterionId: 'crit_grammar_mechanics', originalAiScore: 15, finalScore: 17, reason: 'Errors are consistent but never block understanding; I judged this closer to typical B2 grammar control than the AI estimate.', teacherId: 'teacher_elif_yilmaz', timestamp: '2026-07-30T11:16:00+03:00' },
    ],
    teacherFeedback: 'Barış, your ideas are clear and your opinion is genuine. Focus on subject–verb agreement this week — it appeared several times and is very fixable with practice.',
    reviewedBy: 'teacher_elif_yilmaz',
    reviewedAt: '2026-07-30T11:16:00+03:00',
  },
  // Assignment: Social Media — still analyzing
  {
    id: 'sub_ceren_social_media',
    assignmentId: 'assignment_social_media',
    isPractice: false,
    studentId: 'student_ceren_sahin',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'for_and_against_essay',
    level: 'B2',
    topicTitle: 'Social Media: Help or Harm?',
    text: `Social media plays a huge role in teenagers' lives today. Some people argue that it causes more problems than it solves, while others see it as a valuable tool. This essay discusses both perspectives.

Critics argue that constant exposure to curated content can harm self-image and reduce attention spans. Supporters, however, point out that it enables communication across distances and provides access to educational resources that were previously harder to reach.

Overall, I believe the key issue is balance rather than the technology itself.`,
    wordCount: 98,
    status: 'analyzing',
    submittedAt: '2026-08-03T07:40:00+03:00',
    lastSavedAt: '2026-08-03T07:40:00+03:00',
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  // Assignment: Social Media — still writing (in progress, not submitted)
  {
    id: 'sub_deniz_social_media',
    assignmentId: 'assignment_social_media',
    isPractice: false,
    studentId: 'student_deniz_yildiz',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'for_and_against_essay',
    level: 'B2',
    topicTitle: 'Social Media: Help or Harm?',
    text: `Social media is used by almost every teenager nowadays. Some people think it has a negative influence on young people, while others disagree with this idea.

On one hand, spending too much time online can affect sleep and school performance.`,
    wordCount: 41,
    status: 'in_progress',
    lastSavedAt: '2026-08-02T21:05:00+03:00',
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  // Assignment: Remote Work (class 11b) — in progress
  {
    id: 'sub_furkan_remote_work',
    assignmentId: 'assignment_remote_work',
    isPractice: false,
    studentId: 'student_furkan_celik',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'advantages_disadvantages_essay',
    level: 'B2',
    topicTitle: 'Working From Home: Weighing the Pros and Cons',
    text: `Remote work has become increasingly common since many companies allow employees to work from home. This essay will discuss its main advantages and disadvantages.

One clear advantage is the flexibility it offers.`,
    wordCount: 32,
    status: 'in_progress',
    lastSavedAt: '2026-08-03T08:10:00+03:00',
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  // Assignment: Remote Work — submitted, analyzing
  {
    id: 'sub_gizem_remote_work',
    assignmentId: 'assignment_remote_work',
    isPractice: false,
    studentId: 'student_gizem_arslan',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'advantages_disadvantages_essay',
    level: 'B2',
    topicTitle: 'Working From Home: Weighing the Pros and Cons',
    text: `In recent years, working from home has become a popular option for many employees. This essay examines both the benefits and the drawbacks of this way of working.

A major advantage of remote work is that employees save time and money by not commuting. They can also organise their day more flexibly. However, working from home can blur the line between personal and professional life, and some workers feel isolated without daily contact with colleagues.

In conclusion, while remote work offers valuable flexibility, it also requires strong self-discipline to be effective.`,
    wordCount: 118,
    status: 'analyzing',
    submittedAt: '2026-08-02T20:00:00+03:00',
    lastSavedAt: '2026-08-02T20:00:00+03:00',
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  // Assignment: Plastic Pollution (custom rubric, score hidden pending review)
  {
    id: 'sub_kaan_plastic',
    assignmentId: 'assignment_plastic_pollution',
    isPractice: false,
    studentId: 'student_kaan_er',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'problem_solution_essay',
    level: 'C1',
    topicTitle: 'Plastic Pollution: Causes and Solutions',
    text: `Plastic pollution is one of the most serious environmental issues today. This essay will explore its main causes and suggest possible solutions.

A key cause is the widespread use of single-use packaging, which is cheap to produce but takes hundreds of years to decompose. In addition, many countries lack sufficient recycling infrastructure, so a large proportion of plastic waste ends up in rivers and oceans instead of being processed properly.

Several solutions could reduce this problem. Governments could tax single-use plastic products to discourage their use, while companies could be required to use biodegradable materials instead. Public awareness campaigns could also encourage people to reduce unnecessary plastic consumption in their daily lives.

In conclusion, solving the plastic pollution crisis will require cooperation between governments, businesses and individuals.`,
    wordCount: 142,
    status: 'teacher_review_pending',
    submittedAt: '2026-07-24T18:00:00+03:00',
    lastSavedAt: '2026-07-24T18:00:00+03:00',
    aiScore: 79,
    scoreVisibleToStudent: false,
    usesCustomRubric: true,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 12, maxScore: 20, weight: 15, explanation: 'Causes and solutions are both addressed, though development stays fairly general.', strongAspects: ['Clear cause/solution split'], developmentAreas: ['Add a specific real-world example, such as a country\'s plastic tax'] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 12, maxScore: 20, weight: 15, explanation: 'Matches the problem-solution genre with a suitable formal register.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 16, maxScore: 20, weight: 35, explanation: 'Very clear separation between the problem and solution sections with accurate linking.', evidenceQuote: 'Several solutions could reduce this problem.', strongAspects: ['Distinct paragraph functions', 'Accurate sequencing language'], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 12, maxScore: 20, weight: 15, explanation: 'Appropriate topic vocabulary with some room for more precise terms.', strongAspects: [], developmentAreas: ['"a large proportion" could be followed by a more specific figure or example'] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Mostly accurate grammar with good sentence variety.', strongAspects: ['Accurate passive voice usage'], developmentAreas: [] },
    ],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  // Assignment: Plastic Pollution — reviewed and published, custom rubric
  {
    id: 'sub_leyla_plastic',
    assignmentId: 'assignment_plastic_pollution',
    isPractice: false,
    studentId: 'student_leyla_bulut',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'problem_solution_essay',
    level: 'C1',
    topicTitle: 'Plastic Pollution: Causes and Solutions',
    text: `Plastic waste has become a major environmental concern in recent years. This essay looks at what causes this problem and how it might be solved.

The main cause is that plastic is cheap and convenient, so companies and consumers use it without thinking about its long-term impact. Also, in some countries, recycling systems are weak, meaning much of the plastic that could be reused ends up in landfill or in the ocean.

To solve this, governments could introduce stricter laws on plastic packaging, and schools could teach students more about the impact of plastic waste from an early age. Individuals also have a role by choosing reusable products.

In conclusion, this is a shared problem that needs shared solutions from governments, industry and individuals alike.`,
    wordCount: 148,
    status: 'result_ready',
    submittedAt: '2026-07-23T17:00:00+03:00',
    lastSavedAt: '2026-07-23T17:00:00+03:00',
    finalScore: 82,
    aiScore: 78,
    scoreVisibleToStudent: true,
    usesCustomRubric: true,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 13, maxScore: 20, weight: 15, explanation: 'Both causes and solutions are covered with reasonable development.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 13, maxScore: 20, weight: 15, explanation: 'Appropriate structure and register for the genre.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 15, maxScore: 20, teacherScore: 17, weight: 35, explanation: 'Strong, logical progression from cause to solution.', strongAspects: ['Clear topic sentences in every paragraph'], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 13, maxScore: 20, weight: 15, explanation: 'Solid range of vocabulary appropriate to the topic.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Generally accurate with minor lapses that do not affect meaning.', strongAspects: [], developmentAreas: [] },
    ],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [
      { id: 'override_leyla_1', submissionId: 'sub_leyla_plastic', criterionId: 'crit_organisation_cohesion', originalAiScore: 15, finalScore: 17, reason: 'Given the extra weight this assignment places on organisation, I felt the topic-sentence discipline across all three paragraphs deserved more credit.', teacherId: 'teacher_zeynep_kara', timestamp: '2026-07-25T09:30:00+03:00' },
    ],
    teacherFeedback: 'Leyla, this is a well-organised response — I raised your organisation score because every paragraph opens with a clear topic sentence. Keep pushing your vocabulary range next time.',
    reviewedBy: 'teacher_zeynep_kara',
    reviewedAt: '2026-07-25T09:30:00+03:00',
  },
  // Assignment: School Uniform (Konya) — result ready
  {
    id: 'sub_nil_uniform',
    assignmentId: 'assignment_school_uniform',
    isPractice: false,
    studentId: 'student_nil_aydemir',
    schoolId: 'school_konya_anadolu',
    writingTypeId: 'argumentative_essay',
    level: 'B1',
    topicTitle: 'Should School Uniforms Be Compulsory?',
    text: `Many schools ask students to wear a uniform. Some people agree with this rule but other people don't like it. In this essay I will give both opinions and my own idea.

People who support uniforms say it makes all students equal because nobody can see who is rich or poor. It also save time in the morning because you don't need to choose clothes. On the other side, people who are against uniforms say it stop students from showing their personality and style.

In my opinion, uniforms are good for younger students but older students should have more freedom to choose their clothes.`,
    wordCount: 121,
    status: 'result_ready',
    submittedAt: '2026-07-19T18:00:00+03:00',
    lastSavedAt: '2026-07-19T18:00:00+03:00',
    finalScore: 71,
    aiScore: 71,
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 15, maxScore: 20, weight: 20, explanation: 'Both sides are presented along with a personal opinion.', strongAspects: ['Clear, specific final opinion'], developmentAreas: [] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Follows the argumentative essay structure appropriately for B1.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Ideas are organised clearly with basic linking devices.', strongAspects: [], developmentAreas: ['Try linkers beyond "but" and "on the other side"'] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 14, maxScore: 20, weight: 20, explanation: 'Appropriate everyday vocabulary for the topic.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 14, maxScore: 20, weight: 20, explanation: 'A few agreement errors, but they rarely affect understanding.', evidenceQuote: 'It also save time in the morning', strongAspects: [], developmentAreas: ['Third-person "-s" in the present simple'] },
    ],
    annotations: [
      { id: 'ann_nil_1', start: 0, end: 0, quotedText: 'It also save time in the morning', severity: 'inaccuracy', categoryId: 'subject_verb_agreement', explanation: 'Present simple third-person verbs need "-s": "it saves".', suggestedCorrection: 'It also saves time in the morning' },
      { id: 'ann_nil_2', start: 0, end: 0, quotedText: 'people who are against uniforms say it stop students', severity: 'inaccuracy', categoryId: 'subject_verb_agreement', explanation: '"It" needs "stops" in the present simple.', suggestedCorrection: 'it stops students' },
    ],
    studyRecommendations: [
      { id: 'rec_nil_1', topicKey: 'errorCategory.subject_verb_agreement', reasonKey: 'studyRec.svaReason', reasonParams: { count: 2 }, studentExampleQuote: 'It also save time in the morning.', explanationKey: 'studyRec.svaExplanation', relatedLessonKey: 'studyRec.lesson.sva', relatedExerciseKey: 'studyRec.exercise.svaEightQuestions', estimatedMinutes: 12, errorCategoryId: 'subject_verb_agreement' },
    ],
    teacherOverrides: [],
    teacherFeedback: 'Good balanced argument, Nil. Watch your present-simple "-s" endings — that is the main thing holding this essay back.',
    reviewedBy: 'teacher_ahmet_demir',
    reviewedAt: '2026-07-21T10:00:00+03:00',
  },
  // Independent practice submissions
  {
    id: 'sub_ada_practice_narrative',
    isPractice: true,
    studentId: 'student_ada_koc',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'narrative_story',
    level: 'B1',
    topicTitle: 'A Trip That Changed My Perspective',
    text: `Last summer, I visited my grandmother's village for the first time in years. When I arrived, I was surprised how quiet and simple life was there compared to the city.

At first, I missed my phone and the internet, but after a few days I started to enjoy walking in the fields and talking to neighbours. I realised that I usually spend too much time online instead of really noticing the world around me.

By the end of the trip, I had changed my mind about what makes a place interesting. Now I try to spend more time outside, even in the city.`,
    wordCount: 118,
    status: 'result_ready',
    submittedAt: '2026-07-15T19:00:00+03:00',
    lastSavedAt: '2026-07-15T19:00:00+03:00',
    finalScore: 78,
    aiScore: 78,
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 16, maxScore: 20, weight: 20, explanation: 'A clear personal change in perspective is shown with concrete detail.', strongAspects: ['Genuine, specific reflection'], developmentAreas: [] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 15, maxScore: 20, weight: 20, explanation: 'Narrative structure with a clear beginning, middle and resolution.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 16, maxScore: 20, weight: 20, explanation: 'Clear time sequencing across paragraphs.', strongAspects: ['"At first… after a few days… by the end" sequencing'], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 15, maxScore: 20, weight: 20, explanation: 'Simple but accurate descriptive vocabulary.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 16, maxScore: 20, weight: 20, explanation: 'Past narrative tenses used accurately throughout.', strongAspects: ['Accurate past perfect: "I had changed my mind"'], developmentAreas: [] },
    ],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
  {
    id: 'sub_furkan_practice_email',
    isPractice: true,
    studentId: 'student_furkan_celik',
    schoolId: 'school_bahcelievler_fen',
    writingTypeId: 'formal_email',
    level: 'B2',
    topicTitle: 'Independent practice: Formal Email',
    text: `Dear Sir or Madam,

I am writing to enquire about the summer English course advertised on your website. Could you please provide more information about the course schedule and the total cost, including materials?

I would also like to know whether there is a placement test before the course begins.

I look forward to your reply.

Yours faithfully,
Furkan Çelik`,
    wordCount: 62,
    status: 'result_ready',
    submittedAt: '2026-07-20T16:00:00+03:00',
    lastSavedAt: '2026-07-20T16:00:00+03:00',
    finalScore: 88,
    aiScore: 88,
    scoreVisibleToStudent: true,
    usesCustomRubric: false,
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 18, maxScore: 20, weight: 20, explanation: 'All requested information points are addressed clearly.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 18, maxScore: 20, weight: 20, explanation: 'Correct formal email conventions from opening to closing.', strongAspects: ['Accurate "Dear Sir or Madam" / "Yours faithfully" pairing'], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Each paragraph has a clear, single purpose.', strongAspects: [], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Appropriately formal vocabulary throughout.', strongAspects: ['"enquire", "placement test" used naturally'], developmentAreas: [] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 18, maxScore: 20, weight: 20, explanation: 'Accurate grammar with polite modal structures.', strongAspects: ['"Could you please provide" — accurate polite request form'], developmentAreas: [] },
    ],
    annotations: [],
    studyRecommendations: [],
    teacherOverrides: [],
  },
];
