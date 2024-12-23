import { Component, Input, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { NoteVersion } from '../../models/note-version.model';
import { VersionChange, VersionComparison } from '../../models/version-comparison.model';
import { VersionHistoryService } from '../../services/version-history.service';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="version-history">
      <h2>Version History</h2>
      
      <mat-list>
        <mat-list-item *ngFor="let version of versions$ | async">
          <div class="version-item">
            <div class="version-info">
              <span class="version-number">v{{ version.version }}</span>
              <span class="version-date">{{ version.createdAt | date:'medium' }}</span>
              <span class="version-author">by {{ version.createdBy }}</span>
            </div>
            
            <div class="version-actions">
              <button mat-icon-button (click)="compareWithCurrent(version)">
                <mat-icon>compare</mat-icon>
              </button>
              <button mat-icon-button (click)="restoreVersion(version)">
                <mat-icon>restore</mat-icon>
              </button>
            </div>
          </div>
        </mat-list-item>
      </mat-list>
    </div>
  `,
  styles: [`
    .version-history {
      padding: 16px;
    }

    .version-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .version-info {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .version-number {
      font-weight: bold;
      min-width: 48px;
    }

    .version-date {
      color: #666;
    }

    .version-author {
      color: #444;
    }

    .version-actions {
      display: flex;
      gap: 8px;
    }
  `]
})
export class VersionHistoryComponent implements OnInit {
  @Input() noteId!: string;
  versions$!: Observable<NoteVersion[]>;

  constructor(
    private versionHistoryService: VersionHistoryService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadVersionHistory();
  }

  private loadVersionHistory() {
    this.versions$ = this.versionHistoryService.getVersionHistory(this.noteId);
  }

  compareWithCurrent(version: NoteVersion) {
    // Open comparison dialog
    this.dialog.open(VersionCompareDialogComponent, {
      width: '800px',
      data: {
        noteId: this.noteId,
        version: version
      }
    });
  }

  async restoreVersion(version: NoteVersion) {
    try {
      await this.versionHistoryService.restoreVersion(this.noteId, version.id).toPromise();
      // Reload version history after restore
      this.loadVersionHistory();
    } catch (error) {
      console.error('Error restoring version:', error);
      // Show error message to user
    }
  }
}

@Component({
  selector: 'app-version-compare-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="version-compare">
      <h2>Compare Versions</h2>
      
      <div class="comparison-view">
        <div class="version-old">
          <h3>Version {{ data.version.version }}</h3>
          <pre [class.addition]="isAddition(change)"
               [class.deletion]="isDeletion(change)"
               [class.modification]="isModification(change)"
               *ngFor="let change of comparison?.changes">
            {{ getChangeContent(change) }}
          </pre>
        </div>
        
        <div class="version-current">
          <h3>Current Version</h3>
          <pre [class.addition]="isAddition(change)"
               [class.deletion]="isDeletion(change)"
               [class.modification]="isModification(change)"
               *ngFor="let change of comparison?.changes">
            {{ getChangeContent(change) }}
          </pre>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button mat-button (click)="close()">Close</button>
        <button mat-button color="primary" (click)="restore()">
          Restore This Version
        </button>
      </div>
    </div>
  `,
  styles: [`
    .version-compare {
      padding: 16px;
    }

    .comparison-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      padding: 4px;
      font-family: monospace;
    }

    .addition {
      background-color: #e6ffe6;
    }

    .deletion {
      background-color: #ffe6e6;
    }

    .modification {
      background-color: #e6e6ff;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `]
})
export class VersionCompareDialogComponent implements OnInit {
  comparison?: VersionComparison;

  constructor(
    private versionHistoryService: VersionHistoryService,
    private dialogRef: MatDialogRef<VersionCompareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      noteId: string;
      version: NoteVersion;
    }
  ) {}

  ngOnInit() {
    this.loadComparison();
  }

  private async loadComparison() {
    try {
      this.comparison = await this.versionHistoryService
        .compareVersions(this.data.noteId, this.data.version.id, 'current')
        .toPromise();
    } catch (error) {
      console.error('Error loading version comparison:', error);
      // Show error message to user
    }
  }

  isAddition(change: VersionChange): boolean {
    return change.type === 'addition';
  }

  isDeletion(change: VersionChange): boolean {
    return change.type === 'deletion';
  }

  isModification(change: VersionChange): boolean {
    return change.type === 'modification';
  }

  getChangeContent(change: VersionChange): string {
    if (this.isModification(change)) {
      return `${change.oldContent} → ${change.content}`;
    }
    return change.content;
  }

  async restore() {
    try {
      await this.versionHistoryService
        .restoreVersion(this.data.noteId, this.data.version.id)
        .toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error restoring version:', error);
      // Show error message to user
    }
  }

  close() {
    this.dialogRef.close();
  }
} 