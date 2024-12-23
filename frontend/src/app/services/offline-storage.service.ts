import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { openDB, IDBPDatabase } from 'idb';
import { Note } from '../models/note.model';

export interface ConflictResolution {
  localChanges: Partial<Note>;
  serverChanges: Partial<Note>;
  resolvedNote: Note;
  strategy: 'local' | 'server' | 'merge';
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private db: IDBPDatabase;
  private readonly DB_NAME = 'notes_offline_db';
  private readonly STORE_NAME = 'notes';
  private readonly PENDING_CHANGES = 'pending_changes';
  private readonly SYNC_META = 'sync_meta';

  private syncStatus = new BehaviorSubject<'idle' | 'syncing' | 'error'>('idle');
  syncStatus$ = this.syncStatus.asObservable();

  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    this.db = await openDB(this.DB_NAME, 1, {
      upgrade(db) {
        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt');
          noteStore.createIndex('userId', 'userId');
        }

        // Pending changes store
        if (!db.objectStoreNames.contains('pending_changes')) {
          const pendingStore = db.createObjectStore('pending_changes', { keyPath: 'id', autoIncrement: true });
          pendingStore.createIndex('noteId', 'noteId');
          pendingStore.createIndex('timestamp', 'timestamp');
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      }
    });
  }

  async saveNote(note: Note): Promise<void> {
    await this.db.put(this.STORE_NAME, {
      ...note,
      updatedAt: new Date().toISOString(),
      pendingSync: true
    });

    await this.addPendingChange({
      noteId: note.id,
      type: 'update',
      changes: note,
      timestamp: new Date().toISOString()
    });
  }

  async getNote(id: string): Promise<Note | null> {
    return this.db.get(this.STORE_NAME, id);
  }

  async getAllNotes(): Promise<Note[]> {
    return this.db.getAll(this.STORE_NAME);
  }

  async resolveConflict(noteId: string, serverNote: Note, localNote: Note): Promise<ConflictResolution> {
    const resolution: ConflictResolution = {
      localChanges: {},
      serverChanges: {},
      resolvedNote: null,
      strategy: 'merge'
    };

    // Compare timestamps
    const serverTime = new Date(serverNote.updatedAt).getTime();
    const localTime = new Date(localNote.updatedAt).getTime();

    if (serverTime > localTime) {
      // Server changes are newer
      resolution.strategy = 'server';
      resolution.resolvedNote = { ...serverNote };
    } else if (localTime > serverTime) {
      // Local changes are newer
      resolution.strategy = 'local';
      resolution.resolvedNote = { ...localNote };
    } else {
      // Same timestamp - need to merge changes
      resolution.strategy = 'merge';
      resolution.resolvedNote = this.mergeNotes(serverNote, localNote);
    }

    // Record the changes for analysis
    resolution.localChanges = this.getChanges(serverNote, localNote);
    resolution.serverChanges = this.getChanges(localNote, serverNote);

    // Save the resolved note
    await this.saveNote(resolution.resolvedNote);
    
    return resolution;
  }

  private mergeNotes(serverNote: Note, localNote: Note): Note {
    const merged = { ...serverNote };

    // Merge text content if both were modified
    if (serverNote.content !== localNote.content) {
      merged.content = this.mergeContent(serverNote.content, localNote.content);
    }

    // Merge metadata
    merged.tags = [...new Set([...serverNote.tags, ...localNote.tags])];
    merged.collaborators = [...new Set([...serverNote.collaborators, ...localNote.collaborators])];
    
    // Keep track of conflict resolution
    merged.metadata = {
      ...merged.metadata,
      hasConflicts: true,
      resolvedAt: new Date().toISOString(),
      conflictDetails: {
        serverTimestamp: serverNote.updatedAt,
        localTimestamp: localNote.updatedAt
      }
    };

    return merged;
  }

  private mergeContent(serverContent: string, localContent: string): string {
    // Simple merge strategy - could be enhanced with diff-match-patch or similar
    if (serverContent === localContent) return serverContent;
    
    return `
=== Server Version ===
${serverContent}

=== Local Version ===
${localContent}
    `.trim();
  }

  private getChanges(oldNote: Note, newNote: Note): Partial<Note> {
    const changes: Partial<Note> = {};
    
    Object.keys(newNote).forEach(key => {
      if (JSON.stringify(oldNote[key]) !== JSON.stringify(newNote[key])) {
        changes[key] = newNote[key];
      }
    });
    
    return changes;
  }

  async addPendingChange(change: { noteId: string; type: string; changes: any; timestamp: string }): Promise<void> {
    await this.db.add(this.PENDING_CHANGES, change);
  }

  async getPendingChanges(): Promise<any[]> {
    return this.db.getAll(this.PENDING_CHANGES);
  }

  async removePendingChange(id: number): Promise<void> {
    await this.db.delete(this.PENDING_CHANGES, id);
  }

  async clearPendingChanges(): Promise<void> {
    await this.db.clear(this.PENDING_CHANGES);
  }

  async getLastSyncTimestamp(): Promise<string | null> {
    const meta = await this.db.get(this.SYNC_META, 'lastSync');
    return meta?.timestamp || null;
  }

  async updateLastSyncTimestamp(): Promise<void> {
    await this.db.put(this.SYNC_META, {
      key: 'lastSync',
      timestamp: new Date().toISOString()
    });
  }

  setSyncStatus(status: 'idle' | 'syncing' | 'error'): void {
    this.syncStatus.next(status);
  }
} 