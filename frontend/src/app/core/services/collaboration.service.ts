import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface DocumentChange {
  documentId: string;
  content: string;
  version: number;
  userId: string;
  timestamp: Date;
}

export interface CollaboratorPresence {
  userId: string;
  name: string;
  cursor: { line: number; ch: number; };
  selection: { anchor: { line: number; ch: number; }; head: { line: number; ch: number; }; };
}

@Injectable({
  providedIn: 'root'
})
export class CollaborationService {
  private socket$: WebSocketSubject<any>;
  private documentChanges$ = new Subject<DocumentChange>();
  private collaborators$ = new BehaviorSubject<CollaboratorPresence[]>([]);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentDocumentId: string | null = null;

  constructor(private authService: AuthService) {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    this.socket$ = webSocket({
      url: `${environment.websocketUrl}/collaboration`,
      openObserver: {
        next: () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          if (this.currentDocumentId) {
            this.joinDocument(this.currentDocumentId);
          }
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket disconnected');
          this.handleDisconnection();
        }
      }
    });

    this.socket$.subscribe(
      message => this.handleMessage(message),
      error => {
        console.error('WebSocket error:', error);
        this.handleDisconnection();
      }
    );
  }

  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.initializeWebSocket(), 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'DOCUMENT_CHANGE':
        this.documentChanges$.next(message.payload);
        break;
      case 'COLLABORATOR_UPDATE':
        this.collaborators$.next(message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  joinDocument(documentId: string) {
    this.currentDocumentId = documentId;
    this.socket$.next({
      type: 'JOIN_DOCUMENT',
      payload: {
        documentId,
        userId: this.authService.getCurrentUser()?.id
      }
    });
  }

  leaveDocument() {
    if (this.currentDocumentId) {
      this.socket$.next({
        type: 'LEAVE_DOCUMENT',
        payload: {
          documentId: this.currentDocumentId,
          userId: this.authService.getCurrentUser()?.id
        }
      });
      this.currentDocumentId = null;
    }
  }

  sendChange(change: Partial<DocumentChange>) {
    if (!this.currentDocumentId) {
      throw new Error('No active document');
    }

    this.socket$.next({
      type: 'DOCUMENT_CHANGE',
      payload: {
        ...change,
        documentId: this.currentDocumentId,
        userId: this.authService.getCurrentUser()?.id,
        timestamp: new Date()
      }
    });
  }

  updatePresence(cursor: { line: number; ch: number; }, selection?: { anchor: { line: number; ch: number; }; head: { line: number; ch: number; }; }) {
    if (!this.currentDocumentId) {
      return;
    }

    this.socket$.next({
      type: 'PRESENCE_UPDATE',
      payload: {
        documentId: this.currentDocumentId,
        userId: this.authService.getCurrentUser()?.id,
        name: this.authService.getCurrentUser()?.name,
        cursor,
        selection
      }
    });
  }

  getDocumentChanges(): Observable<DocumentChange> {
    return this.documentChanges$.asObservable();
  }

  getCollaborators(): Observable<CollaboratorPresence[]> {
    return this.collaborators$.asObservable();
  }

  disconnect() {
    if (this.socket$) {
      this.socket$.complete();
    }
  }
} 