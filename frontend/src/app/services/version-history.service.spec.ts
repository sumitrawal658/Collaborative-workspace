import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { VersionHistoryService } from './version-history.service';
import { NoteVersion } from '../models/note-version.model';
import { VersionComparison } from '../models/version-comparison.model';
import { environment } from '../../environments/environment';

describe('VersionHistoryService', () => {
  let service: VersionHistoryService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/notes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VersionHistoryService]
    });

    service = TestBed.inject(VersionHistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getVersionHistory', () => {
    it('should return version history for a note', () => {
      const noteId = '123';
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

      service.getVersionHistory(noteId).subscribe(versions => {
        expect(versions).toEqual(mockVersions);
      });

      const req = httpMock.expectOne(`${apiUrl}/${noteId}/versions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockVersions);
    });
  });

  describe('compareVersions', () => {
    it('should return version comparison', () => {
      const noteId = '123';
      const versionId = 'v1';
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

      service.compareVersions(noteId, versionId).subscribe(comparison => {
        expect(comparison).toEqual(mockComparison);
      });

      const req = httpMock.expectOne(`${apiUrl}/${noteId}/versions/${versionId}/compare/current`);
      expect(req.request.method).toBe('GET');
      req.flush(mockComparison);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a specific version', () => {
      const noteId = '123';
      const versionId = 'v1';

      service.restoreVersion(noteId, versionId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/${noteId}/versions/${versionId}/restore`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('createVersion', () => {
    it('should create a new version', () => {
      const noteId = '123';
      const content = 'New content';
      const title = 'New title';
      const mockVersion: NoteVersion = {
        id: 'v3',
        noteId: '123',
        version: 3,
        content,
        title,
        createdBy: 'user1',
        createdAt: new Date('2024-01-03')
      };

      service.createVersion(noteId, content, title).subscribe(version => {
        expect(version).toEqual(mockVersion);
      });

      const req = httpMock.expectOne(`${apiUrl}/${noteId}/versions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ content, title });
      req.flush(mockVersion);
    });
  });

  describe('deleteVersion', () => {
    it('should delete a specific version', () => {
      const noteId = '123';
      const versionId = 'v1';

      service.deleteVersion(noteId, versionId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/${noteId}/versions/${versionId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
}); 