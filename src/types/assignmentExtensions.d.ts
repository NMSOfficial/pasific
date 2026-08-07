import './entities';

declare module './entities' {
  interface Assignment {
    vocabularyRequirements?: string;
    patternRequirements?: string;
    maxPoints?: number;
    scoringBreakdown?: {
      rubric: number;
      vocabulary: number;
      patterns: number;
    };
    sharedWithSchool?: boolean;
  }
}
