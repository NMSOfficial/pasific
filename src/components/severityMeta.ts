import { OctagonAlert, TriangleAlert, CircleAlert, Info, type LucideIcon } from 'lucide-react';
import type { ErrorSeverity } from '../types/entities';

export const SEVERITY_META: Record<ErrorSeverity, { icon: LucideIcon; labelKey: string; underline: string }> = {
  critical: { icon: OctagonAlert, labelKey: 'severity.critical.label', underline: 'wavy' },
  mistake: { icon: TriangleAlert, labelKey: 'severity.mistake.label', underline: 'solid' },
  inaccuracy: { icon: CircleAlert, labelKey: 'severity.inaccuracy.label', underline: 'dotted' },
  info: { icon: Info, labelKey: 'severity.info.label', underline: 'dashed' },
};

export const SEVERITY_ORDER: ErrorSeverity[] = ['critical', 'mistake', 'inaccuracy', 'info'];
