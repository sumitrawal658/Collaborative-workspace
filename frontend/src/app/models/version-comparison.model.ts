export interface VersionChange {
  type: 'addition' | 'deletion' | 'modification';
  content: string;
  oldContent?: string;
  lineNumber?: number;
}

export interface VersionComparison {
  changes: VersionChange[];
  oldVersion: string;
  newVersion: string;
  timestamp: Date;
} 