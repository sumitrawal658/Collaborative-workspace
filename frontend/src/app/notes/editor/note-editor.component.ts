import { Component, OnInit, OnDestroy, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Observable, combineLatest } from 'rxjs';
import { takeUntil, map, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule, MatChipGrid, MatChipRow, MatChipInput, MatChipInputEvent } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NotesService, CollaborationService } from '..';
import { SyncService } from '../../services/sync.service';
import { Note } from '../../models/note.model';

interface Change {
  noteId: string;
  content: string;
  userId: string;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
}

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatChipsModule,
    MatIconModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="editor-container">
      <!-- Sync Status Indicator -->
      <div class="sync-status" [ngClass]="syncStatus$ | async">
        <span *ngIf="(syncStatus$ | async) === 'syncing'">Syncing changes...</span>
        <span *ngIf="(syncStatus$ | async) === 'offline'">Offline mode</span>
        <span *ngIf="(syncStatus$ | async) === 'online'">All changes saved</span>
      </div>

      <!-- Editor Content -->
      <div class="editor-content">
        <input
          [(ngModel)]="note.title"
          (ngModelChange)="onTitleChange($event)"
          placeholder="Note title"
          class="title-input"
        />
        
        <div
          #editor
          [contentEditable]="true"
          (input)="onContentChange($event)"
          class="content-editor"
        ></div>

        <!-- Tags -->
        <div class="tags-container">
          <mat-chip-grid #chipGrid>
            <mat-chip-row
              *ngFor="let tag of note.tags"
              [removable]="true"
              (removed)="removeTag(tag)"
            >
              {{tag}}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip-row>
            <input
              matInput
              placeholder="Add tag..."
              [matChipInputFor]="chipGrid"
              (matChipInputTokenEnd)="addTag($event)"
            />
          </mat-chip-grid>
        </div>

        <!-- Collaboration Info -->
        <div class="collaboration-info" *ngIf="activeCollaborators$ | async as collaborators">
          <div *ngFor="let user of collaborators" class="collaborator">
            <div class="avatar" [style.background-color]="user.color">
              {{user.name.charAt(0)}}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      position: relative;
      height: 100%;
      padding: 20px;
    }

    .sync-status {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
    }

    .sync-status.online {
      background-color: #4caf50;
      color: white;
    }

    .sync-status.offline {
      background-color: #f44336;
      color: white;
    }

    .sync-status.syncing {
      background-color: #2196f3;
      color: white;
    }

    .editor-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .title-input {
      width: 100%;
      font-size: 24px;
      padding: 8px;
      border: none;
      outline: none;
      margin-bottom: 16px;
    }

    .content-editor {
      min-height: 400px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      outline: none;
    }

    .tags-container {
      margin-top: 16px;
    }

    .collaboration-info {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
    }

    .collaborator {
      display: flex;
      align-items: center;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
  `]
})
export class NoteEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editor') editorElement!: ElementRef;
  @ViewChild('chipGrid') chipGrid!: MatChipGrid;

  private destroy$ = new Subject<void>();
  private autoSaveInterval = 1000; // 1 second
  private lastSavedContent: string = '';

  note: Note = {
    id: '',
    title: '',
    content: '',
    tags: [],
    updatedAt: new Date(),
    userId: ''
  };

  syncStatus$: Observable<'online' | 'offline' | 'syncing'>;
  activeCollaborators$: Observable<Collaborator[]>;

  constructor(
    private route: ActivatedRoute,
    private notesService: NotesService,
    private collaborationService: CollaborationService,
    private syncService: SyncService
  ) {
    // Initialize sync status
    this.syncStatus$ = combineLatest([
      this.syncService.getSyncStatus(),
      new Observable<boolean>(observer => {
        observer.next(navigator.onLine);
        window.addEventListener('online', () => observer.next(true));
        window.addEventListener('offline', () => observer.next(false));
      })
    ]).pipe(
      map(([pendingChanges, isOnline]) => {
        if (!isOnline) return 'offline';
        return pendingChanges > 0 ? 'syncing' : 'online';
      })
    );

    // Initialize collaborators stream
    this.activeCollaborators$ = this.collaborationService.getActiveCollaborators();
  }

  ngOnInit() {
    // Load note
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.loadNote(params['id']);
    });

    // Set up auto-save
    this.setupAutoSave();

    // Set up real-time collaboration
    this.setupCollaboration();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.collaborationService.disconnect();
  }

  private async loadNote(noteId: string) {
    try {
      // Try to load from server first
      const note = await this.notesService.getNote(noteId).toPromise();
      if (note) {
        this.note = note;
        this.lastSavedContent = note.content;
      } else {
        // If not found on server, try offline storage
        const offlineNote = await this.notesService.getOfflineNote(noteId).toPromise();
        if (offlineNote) {
          this.note = offlineNote;
          this.lastSavedContent = offlineNote.content;
        }
      }
    } catch (error) {
      console.error('Error loading note:', error);
    }
  }

  private setupAutoSave() {
    // Auto-save changes periodically
    setInterval(() => {
      if (this.note.content !== this.lastSavedContent) {
        this.saveNote();
      }
    }, this.autoSaveInterval);
  }

  private setupCollaboration() {
    // Set up WebSocket connection for real-time collaboration
    this.collaborationService.setupConnection(this.note.id);

    // Listen for remote changes
    this.collaborationService.getChanges().pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe((change: Change) => {
      if (change.userId !== this.note.userId) {
        this.handleRemoteChange(change);
      }
    });
  }

  private async saveNote() {
    try {
      await this.notesService.saveNote(this.note).toPromise();
      this.lastSavedContent = this.note.content;
    } catch (error) {
      console.error('Error saving note:', error);
      // If save fails, queue for offline sync
      await this.notesService.saveOfflineNote(this.note).toPromise();
    }
  }

  private handleRemoteChange(change: Change) {
    // Implement operational transformation or other conflict resolution strategy
    this.note.content = change.content;
    this.lastSavedContent = change.content;
  }

  onTitleChange(title: string) {
    this.note.title = title;
    this.saveNote();
  }

  onContentChange(event: Event) {
    const target = event.target as HTMLDivElement;
    this.note.content = target.innerHTML;
    
    // Broadcast change to collaborators
    this.collaborationService.broadcastChange({
      noteId: this.note.id,
      content: this.note.content,
      userId: this.note.userId
    });
  }

  addTag(event: MatChipInputEvent) {
    const value = event.value.trim();
    if (value && !this.note.tags.includes(value)) {
      this.note.tags = [...this.note.tags, value];
      this.saveNote();
    }
    event.chipInput?.clear();
  }

  removeTag(tag: string) {
    this.note.tags = this.note.tags.filter(t => t !== tag);
    this.saveNote();
  }
} 