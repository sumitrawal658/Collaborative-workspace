export interface NoteVersion {
    id: string;
    noteId: string;
    content: string;
    title: string;
    version: number;
    createdBy: string;
    createdAt: Date;
    changes?: {
        type: 'addition' | 'deletion' | 'modification';
        content: string;
        position: number;
    }[];
} 