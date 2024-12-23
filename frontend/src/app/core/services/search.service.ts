import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Note } from '../models/note.model';
import { Page } from '../models/page.model';

export interface SearchFilters {
  query?: string;
  tags?: string[];
  sentiment?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/search`;
  private recentSearches$ = new BehaviorSubject<string[]>([]);
  private recentTags$ = new BehaviorSubject<string[]>([]);

  constructor(private http: HttpClient) {
    this.loadRecentSearches();
    this.loadRecentTags();
  }

  searchNotes(tenantId: string, filters: SearchFilters): Observable<Page<Note>> {
    let params = new HttpParams();

    if (filters.query) {
      params = params.set('query', filters.query);
      this.addRecentSearch(filters.query);
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => {
        params = params.append('tags', tag);
        this.addRecentTag(tag);
      });
    }

    if (filters.sentiment) {
      params = params.set('sentiment', filters.sentiment);
    }

    if (filters.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }

    if (filters.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }

    return this.http.get<Page<Note>>(`${this.apiUrl}/${tenantId}`, { params });
  }

  findSimilarNotes(tenantId: string, noteId: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/${tenantId}/similar/${noteId}`);
  }

  generateTags(content: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/generate-tags`, content);
  }

  suggestTags(tenantId: string, prefix: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${tenantId}/tags/suggest`, {
      params: { prefix }
    });
  }

  getTagUsageStats(tenantId: string): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/${tenantId}/tags/stats`);
  }

  getRecentSearches(): Observable<string[]> {
    return this.recentSearches$.asObservable();
  }

  getRecentTags(): Observable<string[]> {
    return this.recentTags$.asObservable();
  }

  private addRecentSearch(query: string) {
    const searches = this.recentSearches$.value;
    const updatedSearches = [query, ...searches.filter(s => s !== query)].slice(0, 10);
    this.recentSearches$.next(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  }

  private addRecentTag(tag: string) {
    const tags = this.recentTags$.value;
    const updatedTags = [tag, ...tags.filter(t => t !== tag)].slice(0, 10);
    this.recentTags$.next(updatedTags);
    localStorage.setItem('recentTags', JSON.stringify(updatedTags));
  }

  private loadRecentSearches() {
    try {
      const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      this.recentSearches$.next(searches);
    } catch (e) {
      console.error('Error loading recent searches:', e);
      this.recentSearches$.next([]);
    }
  }

  private loadRecentTags() {
    try {
      const tags = JSON.parse(localStorage.getItem('recentTags') || '[]');
      this.recentTags$.next(tags);
    } catch (e) {
      console.error('Error loading recent tags:', e);
      this.recentTags$.next([]);
    }
  }
} 