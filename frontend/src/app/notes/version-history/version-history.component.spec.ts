import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { VersionHistoryComponent, VersionCompareDialogComponent } from './version-history.component';
import { VersionHistoryService } from '../../services/version-history.service';
import { NoteVersion } from '../../models/note-version.model';
import { VersionChange, VersionComparison } from '../../models/version-comparison.model';

type SpyObj<T> = {
  [P in keyof T]: T[P] extends Function ? jasmine.Spy : T[P];
};

function createSpyObj<T>(baseName: string, methodNames: Array<keyof T>): SpyObj<T> {
  const obj: any = {};
  for (const methodName of methodNames) {
    obj[methodName] = jasmine.createSpy(`${baseName}.${String(methodName)}`);
  }
  return obj;
}

describe('VersionHistoryComponent', () => {
  let component: VersionHistoryComponent;
  let fixture: ComponentFixture<VersionHistoryComponent>;
  let versionHistoryService: SpyObj<VersionHistoryService>;
  let dialog: SpyObj<MatDialog>;

  const mockVersions: NoteVersion[] = [
    {
      id: 'v1',
      noteId: '123',
      version: 1,
      content: 'Test content 1',
      title: 'Test title 1',
      createdBy: 'user1',
      createdAt: new Date('2024-01-01')
    },
    {
      id: 'v2',
      noteId: '123',
      version: 2,
      content: 'Test content 2',
      title: 'Test title 2',
      createdBy: 'user1',
      createdAt: new Date('2024-01-02')
    }
  ];

  beforeEach(async () => {
    const versionHistoryServiceSpy = createSpyObj<VersionHistoryService>('VersionHistoryService', [
      'getVersionHistory',
      'restoreVersion'
    ]);
    const dialogSpy = createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        VersionHistoryComponent
      ],
      providers: [
        { provide: VersionHistoryService, useValue: versionHistoryServiceSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    versionHistoryService = TestBed.inject(VersionHistoryService) as unknown as SpyObj<VersionHistoryService>;
    dialog = TestBed.inject(MatDialog) as unknown as SpyObj<MatDialog>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VersionHistoryComponent);
    component = fixture.componentInstance;
    component.noteId = '123';
    versionHistoryService.getVersionHistory.and.returnValue(of(mockVersions));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load version history on init', () => {
    expect(versionHistoryService.getVersionHistory).toHaveBeenCalledWith('123');
    component.versions$.subscribe(versions => {
      expect(versions).toEqual(mockVersions);
    });
  });

  it('should open compare dialog when comparing versions', () => {
    const version = mockVersions[0];
    component.compareWithCurrent(version);

    expect(dialog.open).toHaveBeenCalledWith(VersionCompareDialogComponent, {
      width: '800px',
      data: {
        noteId: '123',
        version: version
      }
    });
  });

  it('should restore version and reload history', async () => {
    const version = mockVersions[0];
    versionHistoryService.restoreVersion.and.returnValue(of(void 0));

    await component.restoreVersion(version);

    expect(versionHistoryService.restoreVersion).toHaveBeenCalledWith('123', 'v1');
    expect(versionHistoryService.getVersionHistory).toHaveBeenCalledTimes(2);
  });
});

describe('VersionCompareDialogComponent', () => {
  let component: VersionCompareDialogComponent;
  let fixture: ComponentFixture<VersionCompareDialogComponent>;
  let versionHistoryService: SpyObj<VersionHistoryService>;
  let dialogRef: SpyObj<MatDialogRef<VersionCompareDialogComponent>>;

  const mockVersion: NoteVersion = {
    id: 'v1',
    noteId: '123',
    version: 1,
    content: 'Test content 1',
    title: 'Test title 1',
    createdBy: 'user1',
    createdAt: new Date('2024-01-01')
  };

  const mockComparison: VersionComparison = {
    changes: [
      {
        type: 'addition',
        content: 'New line',
        lineNumber: 1
      },
      {
        type: 'deletion',
        content: 'Old line',
        lineNumber: 2
      }
    ],
    oldVersion: 'v1',
    newVersion: 'current',
    timestamp: new Date('2024-01-01')
  };

  beforeEach(async () => {
    const versionHistoryServiceSpy = createSpyObj<VersionHistoryService>('VersionHistoryService', [
      'compareVersions',
      'restoreVersion'
    ]);
    const dialogRefSpy = createSpyObj<MatDialogRef<VersionCompareDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        VersionCompareDialogComponent
      ],
      providers: [
        { provide: VersionHistoryService, useValue: versionHistoryServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: { noteId: '123', version: mockVersion } },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    versionHistoryService = TestBed.inject(VersionHistoryService) as unknown as SpyObj<VersionHistoryService>;
    dialogRef = TestBed.inject(MatDialogRef) as unknown as SpyObj<MatDialogRef<VersionCompareDialogComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VersionCompareDialogComponent);
    component = fixture.componentInstance;
    versionHistoryService.compareVersions.and.returnValue(of(mockComparison));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load comparison on init', () => {
    expect(versionHistoryService.compareVersions).toHaveBeenCalledWith('123', 'v1', 'current');
    expect(component.comparison).toEqual(mockComparison);
  });

  it('should identify change types correctly', () => {
    const addition: VersionChange = { type: 'addition', content: 'New line' };
    const deletion: VersionChange = { type: 'deletion', content: 'Old line' };
    const modification: VersionChange = { type: 'modification', content: 'New line', oldContent: 'Old line' };

    expect(component.isAddition(addition)).toBe(true);
    expect(component.isDeletion(deletion)).toBe(true);
    expect(component.isModification(modification)).toBe(true);
  });

  it('should format change content correctly', () => {
    const addition: VersionChange = { type: 'addition', content: 'New line' };
    const modification: VersionChange = { type: 'modification', content: 'New line', oldContent: 'Old line' };

    expect(component.getChangeContent(addition)).toBe('New line');
    expect(component.getChangeContent(modification)).toBe('Old line → New line');
  });

  it('should restore version and close dialog', async () => {
    versionHistoryService.restoreVersion.and.returnValue(of(void 0));

    await component.restore();

    expect(versionHistoryService.restoreVersion).toHaveBeenCalledWith('123', 'v1');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalled();
  });
}); 