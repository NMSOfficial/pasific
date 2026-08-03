import type { ActivationCode } from '../types/entities';

export const ACTIVATION_CODES: ActivationCode[] = [
  { id: 'code_1', code: 'PSFC-7K2M-91XQ', schoolId: 'school_bahcelievler_fen', classId: 'class_10a_bahcelievler', status: 'unused', createdAt: '2026-07-20T10:00:00+03:00', expiresAt: '2026-12-31T23:59:59+03:00', batchId: 'batch_10a_2026' },
  { id: 'code_2', code: 'PSFC-3B8N-44LT', schoolId: 'school_bahcelievler_fen', classId: 'class_10a_bahcelievler', status: 'used', createdAt: '2025-09-05T10:00:00+03:00', expiresAt: '2026-06-30T23:59:59+03:00', usedByStudentId: 'student_ada_koc', usedAt: '2025-09-10T09:00:00+03:00', batchId: 'batch_10a_2025' },
  { id: 'code_3', code: 'PSFC-QQ01-77ZP', schoolId: 'school_bahcelievler_fen', classId: 'class_9c_bahcelievler', status: 'expired', createdAt: '2025-09-01T10:00:00+03:00', expiresAt: '2025-12-31T23:59:59+03:00', batchId: 'batch_9c_2025' },
  { id: 'code_4', code: 'PSFC-VV55-10CM', schoolId: 'school_bahcelievler_fen', classId: 'class_11b_bahcelievler', status: 'revoked', createdAt: '2025-09-05T10:00:00+03:00', expiresAt: '2026-06-30T23:59:59+03:00', batchId: 'batch_11b_2025' },
  { id: 'code_5', code: 'PSFC-2K9X-771A', schoolId: 'school_konya_anadolu', classId: 'class_10a_konya', status: 'unused', createdAt: '2026-07-22T10:00:00+03:00', expiresAt: '2026-12-31T23:59:59+03:00', batchId: 'batch_konya_10a_2026' },
  { id: 'code_6', code: 'PSFC-8H4R-33WD', schoolId: 'school_konya_anadolu', classId: 'class_10a_konya', status: 'used', createdAt: '2025-09-20T10:00:00+03:00', expiresAt: '2026-06-30T23:59:59+03:00', usedByStudentId: 'student_nil_aydemir', usedAt: '2025-09-23T09:00:00+03:00', batchId: 'batch_konya_10a_2025' },
];
