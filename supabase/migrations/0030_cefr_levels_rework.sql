-- Reworks the CEFR level scale from (B1, B2, C1, C2) to
-- (B1, B1+, B2, B2+, C1): narrower bands give the AI grader a clearer,
-- less ambiguous target to score against, which is the point of also
-- rewriting the descriptors below to be far more detailed than the
-- original one-line summaries — server/gemini.ts now includes the full
-- descriptor text for the assignment's level in the grading prompt
-- instead of just the bare level code.
--
-- C2 had 4 rows in writing_examples (no catalog_topics, assignments or
-- submissions used it) — remapped to C1, the new top level, before the
-- check constraint changes below would otherwise reject them.
update writing_examples set level = 'C1' where level = 'C2';

alter table catalog_topics drop constraint catalog_topics_level_check;
alter table catalog_topics add constraint catalog_topics_level_check check (level in ('B1', 'B1+', 'B2', 'B2+', 'C1'));

alter table writing_examples drop constraint writing_examples_level_check;
alter table writing_examples add constraint writing_examples_level_check check (level in ('B1', 'B1+', 'B2', 'B2+', 'C1'));

alter table assignments drop constraint assignments_level_check;
alter table assignments add constraint assignments_level_check check (level in ('B1', 'B1+', 'B2', 'B2+', 'C1'));

alter table submissions drop constraint submissions_level_check;
alter table submissions add constraint submissions_level_check check (level in ('B1', 'B1+', 'B2', 'B2+', 'C1'));

delete from cefr_level_descriptors where level = 'C2';

alter table cefr_level_descriptors drop constraint cefr_level_descriptors_level_check;
alter table cefr_level_descriptors add constraint cefr_level_descriptors_level_check check (level in ('B1', 'B1+', 'B2', 'B2+', 'C1'));

insert into cefr_level_descriptors (level, descriptor) values ('B1+', ''), ('B2+', '')
on conflict (level) do nothing;

update cefr_level_descriptors set descriptor = 'Can write simple connected text on familiar, everyday topics. Uses a limited but growing range of vocabulary and mostly simple or compound sentences; grammatical slips (tense, articles, prepositions, subject-verb agreement) are frequent but rarely block understanding. Ideas tend to be listed rather than developed with reasoning or examples, and paragraphing/organisation can be inconsistent. Linking is achieved mainly through simple connectors (and, but, because, so). At this level, reward clear communication of a basic idea over grammatical polish.', updated_at = now()
where level = 'B1';

update cefr_level_descriptors set descriptor = 'Can write on a wider range of familiar and some less-familiar topics, with a clearer overall structure than B1. Some ideas are developed with a reason or a brief example, though development is uneven across paragraphs — a strong opening point may trail off without support. Grammar is more controlled than B1 but errors still surface under complexity (conditionals, passive voice, relative clauses); vocabulary is more varied but repetition of the same words/phrases is still noticeable. Uses a wider set of linking devices (however, in addition, for example, as a result) though not always accurately or naturally placed.', updated_at = now()
where level = 'B1+';

update cefr_level_descriptors set descriptor = 'Can write clear, detailed texts on a range of subjects, developing an argument with supporting points and relevant examples rather than just stating opinions. Good control of a range of grammatical structures with only occasional, non-systematic errors that don''t interfere with meaning. Vocabulary is reasonably wide and mostly used appropriately, including some less common lexis and collocations, though word choice can occasionally be slightly off or overly simple for the context. Organisation is generally logical with effective paragraphing and a good range of cohesive devices, though some sections may still be under-developed relative to others.', updated_at = now()
where level = 'B2';

update cefr_level_descriptors set descriptor = 'Can write well-developed, well-organised texts that engage with a topic in some depth, including counter-arguments or alternative perspectives where relevant — not just a list of same-sided points. Grammar is controlled across a wide range of structures, with errors rare and rarely impeding communication, even in complex sentence forms. Vocabulary is precise and varied, with good use of collocation and register-appropriate word choice (e.g. consistently formal or consistently conversational as the task requires). Cohesion is handled flexibly — not just through explicit connectors but through pronoun reference, substitution, and natural paragraph-to-paragraph flow.', updated_at = now()
where level = 'B2+';

update cefr_level_descriptors set descriptor = 'Can write well-structured, detailed texts on complex subjects, using organisational patterns and cohesive devices effectively and flexibly to guide the reader through a sophisticated line of argument. Wide vocabulary used with precision, including idiomatic and nuanced expressions appropriate to register and purpose. Grammar is consistently accurate; any errors are minor, isolated, and typically involve rare or highly complex structures rather than basic ones. Able to develop a clear evaluative stance, synthesise multiple ideas or sources, and deliberately adapt style and tone for rhetorical effect rather than by default.', updated_at = now()
where level = 'C1';
