export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: Date;
    userId: string;
    version?: number;
    collaborators?: string[];
    isDeleted?: boolean;
    lastSyncedAt?: Date;
} 