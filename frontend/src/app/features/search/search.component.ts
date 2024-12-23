import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SearchService, SearchFilters } from '../../core/services/search.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { Page } from '../../core/models/page.model';

@Component({
  selector: 'app-search',
  template: `
    <div class="search-container">
      <form [formGroup]="searchForm" class="search-form">
        <mat-form-field class="search-input">
          <mat-label>Search notes</mat-label>
          <input matInput formControlName="query" placeholder="Enter keywords...">
          <button mat-icon-button matSuffix (click)="clearSearch()" *ngIf="searchForm.get('query')?.value">
            <mat-icon>clear</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field class="tag-input">
          <mat-label>Tags</mat-label>
          <mat-chip-list #chipList>
            <mat-chip
              *ngFor="let tag of selectedTags"
              [removable]="true"
              (removed)="removeTag(tag)">
              {{tag}}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
            <input
              placeholder="Add tags..."
              [matChipInputFor]="chipList"
              [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
              [matChipInputAddOnBlur]="true"
              (matChipInputTokenEnd)="addTag($event)">
          </mat-chip-list>
          <mat-hint>Press Enter or comma to add tags</mat-hint>
        </mat-form-field>

        <mat-form-field class="sentiment-select">
          <mat-label>Sentiment</mat-label>
          <mat-select formControlName="sentiment">
            <mat-option>None</mat-option>
            <mat-option value="POSITIVE">Positive</mat-option>
            <mat-option value="NEUTRAL">Neutral</mat-option>
            <mat-option value="NEGATIVE">Negative</mat-option>
          </mat-select>
        </mat-form-field>
      </form>

      <div class="search-results" *ngIf="results">
        <h3>Results ({{results.totalElements}})</h3>
        
        <mat-card *ngFor="let note of results.content" class="note-card">
          <mat-card-header>
            <mat-card-title>{{note.title}}</mat-card-title>
            <mat-card-subtitle>
              Last modified: {{note.updatedAt | date:'medium'}}
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <p [innerHTML]="highlightSearchTerms(note.content)"></p>
            
            <mat-chip-list>
              <mat-chip *ngFor="let tag of note.tags" color="primary" selected>
                {{tag}}
              </mat-chip>
            </mat-chip-list>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button [routerLink]="['/notes', note.id]">
              Open
            </button>
            <button mat-button (click)="findSimilar(note)">
              Find Similar
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-paginator
          [length]="results.totalElements"
          [pageSize]="results.size"
          [pageIndex]="results.number"
          [pageSizeOptions]="[5, 10, 25, 50]"
          (page)="onPageChange($event)">
        </mat-paginator>
      </div>

      <div class="no-results" *ngIf="results?.content.length === 0">
        <mat-icon>search_off</mat-icon>
        <p>No results found</p>
      </div>

      <div class="recent-searches" *ngIf="!results && recentSearches.length > 0">
        <h3>Recent Searches</h3>
        <mat-chip-list>
          <mat-chip
            *ngFor="let search of recentSearches"
            (click)="applyRecentSearch(search)">
            {{search}}
          </mat-chip>
        </mat-chip-list>
      </div>

      <div class="popular-tags" *ngIf="!results && popularTags.length > 0">
        <h3>Popular Tags</h3>
        <mat-chip-list>
          <mat-chip
            *ngFor="let tag of popularTags"
            (click)="addTagToSearch(tag)">
            {{tag}}
          </mat-chip>
        </mat-chip-list>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .search-form {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-input {
      width: 100%;
    }

    .tag-input {
      width: 300px;
    }

    .sentiment-select {
      width: 200px;
    }

    .note-card {
      margin-bottom: 16px;
    }

    .note-card mat-card-content {
      margin-top: 16px;
    }

    .note-card mat-chip-list {
      margin-top: 8px;
    }

    .no-results {
      text-align: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.54);
    }

    .no-results mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .recent-searches,
    .popular-tags {
      margin-top: 24px;
    }

    .recent-searches mat-chip,
    .popular-tags mat-chip {
      cursor: pointer;
    }

    .highlight {
      background-color: yellow;
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;
  results: Page<Note> | null = null;
  selectedTags: string[] = [];
  recentSearches: string[] = [];
  popularTags: string[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private searchService: SearchService,
    private authService: AuthService
  ) {
    this.searchForm = this.fb.group({
      query: [''],
      sentiment: ['']
    });
  }

  ngOnInit() {
    const tenantId = this.authService.getCurrentUser()?.tenantId;
    if (!tenantId) return;

    // Subscribe to form changes
    this.searchForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.search());

    // Load recent searches and popular tags
    this.searchService.getRecentSearches()
      .pipe(takeUntil(this.destroy$))
      .subscribe(searches => this.recentSearches = searches);

    this.searchService.getTagUsageStats(tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.popularTags = Object.entries(stats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search() {
    const tenantId = this.authService.getCurrentUser()?.tenantId;
    if (!tenantId) return;

    const filters: SearchFilters = {
      query: this.searchForm.get('query')?.value,
      tags: this.selectedTags,
      sentiment: this.searchForm.get('sentiment')?.value,
      page: 0,
      size: 10
    };

    this.searchService.searchNotes(tenantId, filters)
      .subscribe(results => this.results = results);
  }

  clearSearch() {
    this.searchForm.patchValue({ query: '' });
    this.selectedTags = [];
    this.results = null;
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.selectedTags.push(value);
      this.search();
    }
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index >= 0) {
      this.selectedTags.splice(index, 1);
      this.search();
    }
  }

  onPageChange(event: any) {
    const tenantId = this.authService.getCurrentUser()?.tenantId;
    if (!tenantId) return;

    const filters: SearchFilters = {
      query: this.searchForm.get('query')?.value,
      tags: this.selectedTags,
      sentiment: this.searchForm.get('sentiment')?.value,
      page: event.pageIndex,
      size: event.pageSize
    };

    this.searchService.searchNotes(tenantId, filters)
      .subscribe(results => this.results = results);
  }

  findSimilar(note: Note) {
    const tenantId = this.authService.getCurrentUser()?.tenantId;
    if (!tenantId) return;

    this.searchService.findSimilarNotes(tenantId, note.id)
      .subscribe(similarNotes => {
        this.results = {
          content: similarNotes,
          totalElements: similarNotes.length,
          size: similarNotes.length,
          number: 0,
          totalPages: 1
        };
      });
  }

  applyRecentSearch(search: string) {
    this.searchForm.patchValue({ query: search });
  }

  addTagToSearch(tag: string) {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
      this.search();
    }
  }

  highlightSearchTerms(text: string): string {
    const query = this.searchForm.get('query')?.value;
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }
} 