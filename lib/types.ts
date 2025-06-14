export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  isAtomic?: boolean;
  sourceNoteId?: string;
  isSummary?: boolean;
  linkedAtomicNoteIds?: string[];
  hubTheme?: string;
  noteType?: 'source' | 'atomic' | 'hub' | 'structured';
  globalNumber?: number;
}