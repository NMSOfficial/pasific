import type { WritingExample } from '../types/entities';

export const WRITING_EXAMPLES: WritingExample[] = [
  {
    id: 'example_social_media_b2',
    writingTypeId: 'for_and_against_essay',
    level: 'B2',
    topicId: 'topic_social_media_teens',
    title: 'Social Media and Teenagers — Strong B2 Response',
    text: `Nowadays, almost every teenager uses social media every day. While some people think this brings mainly negative effects, others believe it also has real benefits. This essay will look at both sides before giving my own opinion.

On the one hand, social media can have harmful effects on teenagers. Many young people compare their lives to the carefully chosen photos they see online, which can lower their self-esteem. In addition, spending too much time scrolling can reduce the time available for sleep, homework and face-to-face friendships.

On the other hand, social media also offers clear advantages. It allows teenagers to stay in contact with friends and family who live far away, and it can be a useful tool for learning, since many students follow educational accounts. Moreover, it gives young people a space to express their creativity and find communities who share their interests.

In my opinion, social media itself is neither good nor bad; it depends on how it is used. If teenagers are taught to manage their time and use it responsibly, the benefits can outweigh the risks. Therefore, schools and parents should focus on guiding safe use rather than banning it completely.`,
    overallScore: 84,
    performanceBand: 'strong',
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Both sides are addressed with a clear, well-supported personal opinion.', evidenceQuote: 'In my opinion, social media itself is neither good nor bad; it depends on how it is used.', strongAspects: ['Balanced treatment of both views', 'Clear final position'], developmentAreas: ['Could add one more specific example to strengthen the argument'] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Matches the for-and-against essay genre well, with an appropriately neutral tone before the opinion.', strongAspects: ['Neutral register maintained in the body'], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 16, maxScore: 20, weight: 20, explanation: 'Paragraphing is clear and linking devices are used accurately.', evidenceQuote: 'On the other hand, social media also offers clear advantages.', strongAspects: ['Clear paragraph functions', 'Effective contrast linkers'], developmentAreas: ['The conclusion could refer back to a specific point from the body'] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Good range of topic vocabulary with only minor repetition.', strongAspects: ['Natural collocations such as "lower their self-esteem"'], developmentAreas: ['"clear advantages" and "clear opinion" repeated — try a synonym'] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Grammar is mostly accurate with a good range of sentence structures.', strongAspects: ['Accurate use of conditionals in the final paragraph'], developmentAreas: [] },
    ],
    strongPoints: ['Balanced structure', 'Clear personal opinion in conclusion', 'Good range of linking devices'],
    weakPoints: ['Some repetition of vocabulary', 'Conclusion could reference a specific earlier point'],
    annotations: [
      { id: 'ann_1', start: 0, end: 0, quotedText: 'Nowadays, almost every teenager uses social media every day.', severity: 'info', categoryId: 'repetition', explanation: '"Social media" and related words are repeated often; this is acceptable here but watch for overuse across the whole essay.', hint: 'Consider a synonym like "these platforms" in later sentences.' },
    ],
    teacherExplanation: 'This response earns a strong score because it is balanced, well organised, and ends with a genuine, supported opinion rather than a generic summary.',
  },
  {
    id: 'example_plastic_c1',
    writingTypeId: 'problem_solution_essay',
    level: 'C1',
    topicId: 'topic_plastic_pollution',
    title: 'Reducing Plastic Pollution — Advanced C1 Response',
    text: `Plastic pollution has become one of the most pressing environmental challenges of our time, with single-use packaging accumulating in oceans and landfills at an alarming rate. This essay examines the root causes of the problem and proposes several practical solutions.

The primary cause of plastic pollution is the convenience-driven culture of disposability that characterises modern consumption. Manufacturers favour cheap, lightweight plastic packaging because it reduces production costs, while consumers rarely consider the long-term environmental cost of a product they use for mere minutes. Furthermore, waste management infrastructure in many countries has failed to keep pace with the sheer volume of plastic being produced, meaning that a significant proportion never reaches proper recycling facilities.

Addressing this problem requires action at multiple levels. Governments could introduce stricter regulations, such as taxing single-use plastics or mandating minimum recycled content in packaging, as several European countries have already done with measurable success. At the same time, businesses should be encouraged, through incentives or public pressure, to redesign packaging using biodegradable alternatives. Finally, individuals can contribute meaningfully by reducing unnecessary consumption and supporting brands that prioritise sustainability.

In conclusion, while the scale of plastic pollution can seem overwhelming, a combination of regulatory, corporate and individual action offers a realistic path towards meaningful reduction.`,
    overallScore: 91,
    performanceBand: 'advanced',
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 19, maxScore: 20, weight: 20, explanation: 'Causes and solutions are both explored in depth with specific, realistic detail.', strongAspects: ['Concrete real-world reference to European regulation'], developmentAreas: [] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 18, maxScore: 20, weight: 20, explanation: 'Clear problem-solution structure appropriate to a C1-level analytical essay.', strongAspects: ['Distinct cause and solution sections'], developmentAreas: [] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 18, maxScore: 20, weight: 20, explanation: 'Sophisticated cohesive devices link ideas smoothly across paragraphs.', evidenceQuote: 'At the same time, businesses should be encouraged...', strongAspects: ['Varied, natural-sounding linking phrases'], developmentAreas: [] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 19, maxScore: 20, weight: 20, explanation: 'Precise, topic-specific academic vocabulary used with confidence.', strongAspects: ['"convenience-driven culture of disposability" shows precise, idiomatic phrasing'], developmentAreas: [] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 17, maxScore: 20, weight: 20, explanation: 'Complex sentence structures are handled accurately with only minor lapses.', strongAspects: ['Confident use of participle clauses'], developmentAreas: ['One long sentence in paragraph two could be split for clarity'] },
    ],
    strongPoints: ['Precise academic vocabulary', 'Well-developed, specific solutions', 'Strong cohesion throughout'],
    weakPoints: ['One overly long sentence reduces clarity slightly'],
    annotations: [],
    teacherExplanation: 'A high-scoring response at C1 because it moves beyond generic statements to specific, well-reasoned causes and solutions, using precise academic vocabulary throughout.',
  },
  {
    id: 'example_city_countryside_b1',
    writingTypeId: 'compare_contrast_essay',
    level: 'B1',
    topicId: 'topic_city_vs_countryside',
    title: 'City vs. Countryside — Developing B1 Response',
    text: `Many people is living in big cities today but some peoples prefer the countryside. In this essay I will compare the two place.

In the city, there is a lot of things to do. There are cinemas, shops and restaurant. Also you can find a job easy because there is many company. But the city is very noisy and the traffic is bad every day.

In the countryside, the life is more quiet. The air is more clean and you can see nature. People know they neighbours better. But there is less shop and less job opportunity, so some young people is moving to city.

In conclusion, I think city is better for young people because of jobs, but countryside is better for family who want quiet life. It depend of what you want from life.`,
    overallScore: 58,
    performanceBand: 'developing',
    criterionScores: [
      { criterionId: 'crit_task_fulfilment', criterionKey: 'task_fulfilment', aiScore: 12, maxScore: 20, weight: 20, explanation: 'Both settings are addressed but the comparison stays at a general level.', strongAspects: ['A personal conclusion is offered'], developmentAreas: ['Add specific reasons or examples rather than general statements'] },
      { criterionId: 'crit_genre_achievement', criterionKey: 'genre_achievement', aiScore: 11, maxScore: 20, weight: 20, explanation: 'The structure loosely follows a comparison essay but paragraph focus drifts.', strongAspects: [], developmentAreas: ['Keep each paragraph focused on one clear point of comparison'] },
      { criterionId: 'crit_organisation_cohesion', criterionKey: 'organisation_cohesion', aiScore: 12, maxScore: 20, weight: 20, explanation: 'Basic linking words are used but transitions between ideas are abrupt.', evidenceQuote: 'But the city is very noisy and the traffic is bad every day.', strongAspects: ['Clear paragraph for each location'], developmentAreas: ['Use a wider range of contrast linkers than just "but"'] },
      { criterionId: 'crit_vocabulary_range', criterionKey: 'vocabulary_range', aiScore: 12, maxScore: 20, weight: 20, explanation: 'Vocabulary is basic and appropriate for everyday topics but limited in range.', strongAspects: ['Everyday vocabulary used correctly overall'], developmentAreas: ['"a lot of things", "many company" could be replaced with more precise words'] },
      { criterionId: 'crit_grammar_mechanics', criterionKey: 'grammar_mechanics', aiScore: 11, maxScore: 20, weight: 20, explanation: 'Frequent errors in subject-verb agreement and plural forms affect accuracy.', evidenceQuote: 'Many people is living in big cities today but some peoples prefer the countryside.', strongAspects: [], developmentAreas: ['Review subject–verb agreement, especially with "people"', 'Review singular/plural noun forms'] },
    ],
    strongPoints: ['A clear personal conclusion is given', 'Ideas are understandable despite errors'],
    weakPoints: ['Frequent subject–verb agreement errors', 'Limited vocabulary range', 'General statements instead of specific examples'],
    annotations: [
      { id: 'ann_2', start: 0, end: 60, quotedText: 'Many people is living in big cities today but some peoples prefer the countryside.', severity: 'mistake', categoryId: 'subject_verb_agreement', explanation: '"People" is already plural, so it takes "are", not "is", and does not take an "-s".', suggestedCorrection: 'Many people are living in big cities today but some people prefer the countryside.' },
      { id: 'ann_3', start: 0, end: 40, quotedText: 'there is a lot of things to do', severity: 'inaccuracy', categoryId: 'subject_verb_agreement', explanation: '"Things" is plural, so the verb should agree: "there are a lot of things".', suggestedCorrection: 'there are a lot of things to do' },
    ],
    teacherExplanation: 'This response is understandable and attempts a full comparison, but frequent grammar errors and general vocabulary keep it at a developing B1 level. The next step is targeted work on subject–verb agreement.',
  },
];
