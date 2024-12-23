import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

interface CollaborationMessage {
  type: 'change' | 'cursor' | 'presence';
  noteId: string;
  userId: string;
  data: any;
  timestamp: number;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
  lastActive: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CollaborationService {
  private socket$!: WebSocketSubject<CollaborationMessage>;
  private collaborators$ = new BehaviorSubject<Map<string, Collaborator>>(new Map());
  private changes$ = new Subject<any>();
  private readonly COLORS = [
    '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
    '#FF9800', '#795548', '#607D8B', '#E91E63'
  ];

  constructor(private authService: AuthService) {}

  setupConnection(noteId: string) {
    const userId = this.authService.getCurrentUserId();
    const wsUrl = `${environment.wsUrl}/notes/${noteId}/collaborate?userId=${userId}`;

    this.socket$ = webSocket({
      url: wsUrl,
      openObserver: {
        next: () => {
          console.log('WebSocket connection established');
          this.sendPresence(noteId, userId, true);
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket connection closed');
          this.sendPresence(noteId, userId, false);
        }
      }
    });

    this.socket$.subscribe({
      next: (message) => this.handleMessage(message),
      error: (error) => console.error('WebSocket error:', error),
      complete: () => console.log('WebSocket connection closed')
    });
  }

  private handleMessage(message: CollaborationMessage) {
    switch (message.type) {
      case 'change':
        this.changes$.next(message.data);
        break;
      case 'cursor':
        this.updateCollaboratorCursor(message.userId, message.data);
        break;
      case 'presence':
        this.handlePresence(message.userId, message.data);
        break;
    }
  }

  private updateCollaboratorCursor(userId: string, cursor: { line: number; ch: number }) {
    const collaborators = this.collaborators$.value;
    const collaborator = collaborators.get(userId);
    if (collaborator) {
      collaborator.cursor = cursor;
      collaborator.lastActive = new Date();
      this.collaborators$.next(new Map(collaborators));
    }
  }

  private handlePresence(userId: string, data: { name: string; active: boolean }) {
    const collaborators = this.collaborators$.value;
    if (data.active) {
      if (!collaborators.has(userId)) {
        collaborators.set(userId, {
          id: userId,
          name: data.name,
          color: this.getRandomColor(),
          lastActive: new Date()
        });
      }
    } else {
      collaborators.delete(userId);
    }
    this.collaborators$.next(new Map(collaborators));
  }

  private sendPresence(noteId: string, userId: string, active: boolean) {
    this.socket$.next({
      type: 'presence',
      noteId,
      userId,
      data: {
        name: this.authService.getCurrentUser()?.name || 'Anonymous',
        active
      },
      timestamp: Date.now()
    });
  }

  broadcastChange(change: any) {
    if (this.socket$) {
      this.socket$.next({
        type: 'change',
        noteId: change.noteId,
        userId: this.authService.getCurrentUserId(),
        data: change,
        timestamp: Date.now()
      });
    }
  }

  updateCursor(noteId: string, cursor: { line: number; ch: number }) {
    if (this.socket$) {
      this.socket$.next({
        type: 'cursor',
        noteId,
        userId: this.authService.getCurrentUserId(),
        data: cursor,
        timestamp: Date.now()
      });
    }
  }

  getChanges(): Observable<any> {
    return this.changes$.asObservable();
  }

  getActiveCollaborators(): Observable<Collaborator[]> {
    return this.collaborators$.asObservable().pipe(
      map(collaborators => Array.from(collaborators.values()))
    );
  }

  private getRandomColor(): string {
    return this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
  }

  disconnect() {
    if (this.socket$) {
      this.socket$.complete();
    }
  }
} 