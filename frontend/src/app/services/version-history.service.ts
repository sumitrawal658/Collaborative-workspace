import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NoteVersion } from '../models/note-version.model';
import { VersionComparison } from '../models/version-comparison.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VersionHistoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/notes`;

  constructor(private http: HttpClient) {}

  getVersionHistory(noteId: string): Observable<NoteVersion[]> {
    return this.http.get<NoteVersion[]>(`${this.apiUrl}/${noteId}/versions`)
      .pipe(
        map(versions => versions.map(version => ({
          ...version,
          createdAt: new Date(version.createdAt)
        })))
      );
  }

  getVersion(noteId: string, versionId: string): Observable<NoteVersion> {
    return this.http.get<NoteVersion>(`${this.apiUrl}/${noteId}/versions/${versionId}`)
      .pipe(
        map(version => ({
          ...version,
          createdAt: new Date(version.createdAt)
        }))
      );
  }

  compareVersions(
    noteId: string,
    versionId: string,
    compareWith: string = 'current'
  ): Observable<VersionComparison> {
    return this.http.get<VersionComparison>(
      `${this.apiUrl}/${noteId}/versions/${versionId}/compare/${compareWith}`
    ).pipe(
      map(comparison => ({
        ...comparison,
        timestamp: new Date(comparison.timestamp)
      }))
    );
  }

  restoreVersion(noteId: string, versionId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${noteId}/versions/${versionId}/restore`,
      {}
    );
  }

  createVersion(noteId: string, content: string, title: string): Observable<NoteVersion> {
    return this.http.post<NoteVersion>(
      `${this.apiUrl}/${noteId}/versions`,
      { content, title }
    ).pipe(
      map(version => ({
        ...version,
        createdAt: new Date(version.createdAt)
      }))
    );
  }

  deleteVersion(noteId: string, versionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${noteId}/versions/${versionId}`
    );
  }
} 