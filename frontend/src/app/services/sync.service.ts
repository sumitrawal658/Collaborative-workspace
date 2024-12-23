import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, interval, of } from 'rxjs';
import { catchError, mergeMap, retryWhen, delay, take, tap, filter } from 'rxjs/operators';
import { OfflineStorageService } from './offline-storage.service';
import { NetworkService } from './network.service';
import { Note } from '../models/note.model';

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'completed';
  progress: number;
  total: number;
  lastSync: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  private syncStatus = new BehaviorSubject<SyncStatus>({
    status: 'idle',
    progress: 0,
    total: 0,
    lastSync: null
  });

  constructor(
    private http: HttpClient,
    private offlineStorage: OfflineStorageService,
    private networkService: NetworkService
  ) {
    this.initializeBackgroundSync();
  }

  getSyncStatus(): Observable<SyncStatus> {
    return this.syncStatus.asObservable();
  }

  private initializeBackgroundSync() {
    // Start periodic sync when online
    this.networkService.isOnline$.pipe(
      filter(isOnline => isOnline)
    ).subscribe(() => {
      this.startPeriodicSync();
    });

    // Attempt immediate sync when coming back online
    this.networkService.onlineEvent$.subscribe(() => {
      this.syncNow();
    });
  }

  private startPeriodicSync() {
    interval(this.SYNC_INTERVAL).pipe(
      filter(() => this.networkService.isOnline)
    ).subscribe(() => {
      this.syncNow();
    });
  }

  async syncNow(): Promise<void> {
    if (this.syncStatus.value.status === 'syncing') {
      return; // Already syncing
    }

    try {
      const pendingChanges = await this.offlineStorage.getPendingChanges();
      if (pendingChanges.length === 0) {
        return; // Nothing to sync
      }

      this.updateSyncStatus({
        status: 'syncing',
        progress: 0,
        total: pendingChanges.length,
        lastSync: new Date().toISOString()
      });

      for (let i = 0; i < pendingChanges.length; i++) {
        const change = pendingChanges[i];
        
        try {
          await this.processChange(change);
          this.updateSyncStatus({
            ...this.syncStatus.value,
            progress: i + 1
          });
        } catch (error) {
          if (change.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            // Move to dead letter queue or handle permanently failed changes
            await this.handleFailedChange(change, error);
          } else {
            // Increment retry count and keep in pending changes
            await this.retryChange(change);
          }
        }
      }

      await this.offlineStorage.updateLastSyncTimestamp();
      this.updateSyncStatus({
        status: 'completed',
        progress: pendingChanges.length,
        total: pendingChanges.length,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      this.updateSyncStatus({
        ...this.syncStatus.value,
        status: 'error',
        error: error.message
      });
    }
  }

  private async processChange(change: any): Promise<void> {
    const { noteId, type, changes } = change;

    // Get the latest server version
    const serverNote = await this.fetchServerNote(noteId);
    const localNote = await this.offlineStorage.getNote(noteId);

    if (serverNote && this.hasConflict(serverNote, localNote)) {
      // Handle conflict
      const resolution = await this.offlineStorage.resolveConflict(noteId, serverNote, localNote);
      await this.saveToServer(resolution.resolvedNote);
    } else {
      // No conflict, proceed with change
      switch (type) {
        case 'create':
        case 'update':
          await this.saveToServer(changes);
          break;
        case 'delete':
          await this.deleteFromServer(noteId);
          break;
      }
    }

    // Remove the processed change
    await this.offlineStorage.removePendingChange(change.id);
  }

  private async fetchServerNote(noteId: string): Promise<Note> {
    return this.http.get<Note>(`/api/notes/${noteId}`).pipe(
      catchError(() => of(null))
    ).toPromise();
  }

  private async saveToServer(note: Note): Promise<void> {
    await this.http.put<void>(`/api/notes/${note.id}`, note).pipe(
      retryWhen(errors => 
        errors.pipe(
          delay(this.RETRY_DELAY),
          take(this.MAX_RETRY_ATTEMPTS)
        )
      )
    ).toPromise();
  }

  private async deleteFromServer(noteId: string): Promise<void> {
    await this.http.delete<void>(`/api/notes/${noteId}`).pipe(
      retryWhen(errors => 
        errors.pipe(
          delay(this.RETRY_DELAY),
          take(this.MAX_RETRY_ATTEMPTS)
        )
      )
    ).toPromise();
  }

  private hasConflict(serverNote: Note, localNote: Note): boolean {
    return serverNote.updatedAt !== localNote.updatedAt;
  }

  private async retryChange(change: any): Promise<void> {
    const updatedChange = {
      ...change,
      retryCount: (change.retryCount || 0) + 1,
      lastRetry: new Date().toISOString()
    };
    await this.offlineStorage.removePendingChange(change.id);
    await this.offlineStorage.addPendingChange(updatedChange);
  }

  private async handleFailedChange(change: any, error: Error): Promise<void> {
    // Log the failed change
    console.error('Sync failed permanently for change:', change, error);
    
    // Could implement a dead letter queue here
    // For now, we'll just remove the failed change
    await this.offlineStorage.removePendingChange(change.id);
  }

  private updateSyncStatus(status: Partial<SyncStatus>) {
    this.syncStatus.next({
      ...this.syncStatus.value,
      ...status
    });
  }
} 