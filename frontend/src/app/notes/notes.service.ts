import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Note } from '../models/note.model';
import { OfflineStorageService } from '../services/offline-storage.service';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly API_URL = '/api/notes';

  constructor(
    private http: HttpClient,
    private offlineStorage: OfflineStorageService
  ) {}

  getNote(id: string): Observable<Note> {
    return this.http.get<Note>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching note:', error);
        return this.getOfflineNote(id);
      })
    );
  }

  saveNote(note: Note): Observable<Note> {
    if (note.id) {
      return this.http.put<Note>(`${this.API_URL}/${note.id}`, note).pipe(
        catchError(error => {
          console.error('Error saving note:', error);
          return this.saveOfflineNote(note);
        })
      );
    } else {
      return this.http.post<Note>(this.API_URL, note).pipe(
        catchError(error => {
          console.error('Error creating note:', error);
          return this.saveOfflineNote(note);
        })
      );
    }
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting note:', error);
        return this.markNoteForDeletion(id);
      })
    );
  }

  getOfflineNote(id: string): Observable<Note> {
    return from(this.offlineStorage.getNote(id));
  }

  saveOfflineNote(note: Note): Observable<Note> {
    return from(this.offlineStorage.saveNote(note));
  }

  private markNoteForDeletion(id: string): Observable<void> {
    return from(this.offlineStorage.markNoteForDeletion(id));
  }

  searchNotes(query: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.API_URL}/search`, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Error searching notes:', error);
        return this.searchOfflineNotes(query);
      })
    );
  }

  private searchOfflineNotes(query: string): Observable<Note[]> {
    return from(this.offlineStorage.searchNotes(query));
  }

  getNotesByTag(tag: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.API_URL}/tags/${tag}`).pipe(
      catchError(error => {
        console.error('Error fetching notes by tag:', error);
        return from(this.offlineStorage.getNotesByTag(tag));
      })
    );
  }
} 