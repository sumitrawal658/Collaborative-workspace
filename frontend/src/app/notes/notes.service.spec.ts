import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotesService } from './notes.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { NetworkService } from '../services/network.service';
import { Note } from '../models/note.model';
import { environment } from '../../environments/environment';
import { firstValueFrom, of } from 'rxjs';

declare global {
  namespace jasmine {
    interface SpyAnd<T = any> {
      returnValue(val: T): void;
      returnValues(...values: any[]): void;
      callFake(fn: (...args: any[]) => any): void;
      throwError(msg: string): void;
      stub(): void;
    }

    interface Calls {
      any(): boolean;
      count(): number;
      argsFor(index: number): any[];
      allArgs(): any[][];
      all(): any[];
      mostRecent(): any;
      first(): any;
      reset(): void;
    }

    interface Spy {
      and: SpyAnd;
      calls: Calls;
      withArgs(...args: any[]): Spy;
    }
  }
}

interface SpyObject {
  [key: string]: jasmine.Spy;
}

type MockService<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jasmine.Spy
    : T[P];
};

describe('NotesService', () => {
  let service: NotesService;
  let httpMock: HttpTestingController;
  let offlineStorageService: MockService<OfflineStorageService>;
  let networkService: MockService<NetworkService>;
  let testNote: Note;

  beforeEach(() => {
    const offlineStorageSpy = jasmine.createSpyObj<OfflineStorageService>('OfflineStorageService', [
      'saveNote',
      'getNote',
      'markForDeletion',
      'searchNotes',
      'getNotesByTag'
    ]);

    const networkServiceSpy = jasmine.createSpyObj<NetworkService>('NetworkService', [], {
      isOnline: true
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotesService,
        { provide: OfflineStorageService, useValue: offlineStorageSpy },
        { provide: NetworkService, useValue: networkServiceSpy }
      ]
    });

    service = TestBed.inject(NotesService);
    httpMock = TestBed.inject(HttpTestingController);
    offlineStorageService = TestBed.inject(OfflineStorageService) as unknown as MockService<OfflineStorageService>;
    networkService = TestBed.inject(NetworkService) as unknown as MockService<NetworkService>;

    testNote = {
      id: '1',
      title: 'Test Note',
      content: 'Test Content',
      tags: ['test'],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      lastModifiedBy: 'user1',
      collaborators: []
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Online Mode', () => {
    it('should create note and save to offline storage', async () => {
      const { id, ...noteData } = testNote;
      offlineStorageService.saveNote.and.returnValue(of(testNote));

      const promise = firstValueFrom(service.createNote(noteData));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/notes`);
      expect(req.request.method).toBe('POST');
      req.flush(testNote);

      const result = await promise;
      expect(result).toEqual(testNote);
      expect(offlineStorageService.saveNote).toHaveBeenCalledWith(testNote);
    });

    it('should get note from server and cache it', async () => {
      offlineStorageService.saveNote.and.returnValue(of(testNote));

      const promise = firstValueFrom(service.getNote('1'));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/notes/1`);
      expect(req.request.method).toBe('GET');
      req.flush(testNote);

      const result = await promise;
      expect(result).toEqual(testNote);
      expect(offlineStorageService.saveNote).toHaveBeenCalledWith(testNote);
    });

    it('should update note and sync with offline storage', async () => {
      const updatedNote = { ...testNote, title: 'Updated Title' };
      offlineStorageService.saveNote.and.returnValue(of(updatedNote));

      const promise = firstValueFrom(service.updateNote('1', { title: 'Updated Title' }));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/notes/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedNote);

      const result = await promise;
      expect(result).toEqual(updatedNote);
      expect(offlineStorageService.saveNote).toHaveBeenCalledWith(updatedNote);
    });

    it('should delete note and mark for deletion in offline storage', async () => {
      offlineStorageService.markForDeletion.and.returnValue(of(void 0));

      const promise = firstValueFrom(service.deleteNote('1'));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/notes/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      await promise;
      expect(offlineStorageService.markForDeletion).toHaveBeenCalledWith('1');
    });
  });

  describe('Offline Mode', () => {
    beforeEach(() => {
      Object.defineProperty(networkService, 'isOnline', { get: () => false });
    });

    it('should create note in offline storage', async () => {
      const { id, ...noteData } = testNote;
      offlineStorageService.saveNote.and.returnValue(of({ ...testNote, isOffline: true }));

      const result = await firstValueFrom(service.createNote(noteData));
      expect(result.isOffline).toBeTrue();
      expect(offlineStorageService.saveNote).toHaveBeenCalled();
      httpMock.expectNone(`${environment.apiUrl}/api/notes`);
    });

    it('should get note from offline storage', async () => {
      offlineStorageService.getNote.and.returnValue(of(testNote));

      const result = await firstValueFrom(service.getNote('1'));
      expect(result).toEqual(testNote);
      expect(offlineStorageService.getNote).toHaveBeenCalledWith('1');
      httpMock.expectNone(`${environment.apiUrl}/api/notes/1`);
    });

    it('should update note in offline storage', async () => {
      const updatedNote = { ...testNote, title: 'Updated Title', isOffline: true };
      offlineStorageService.getNote.and.returnValue(of(testNote));
      offlineStorageService.saveNote.and.returnValue(of(updatedNote));

      const result = await firstValueFrom(service.updateNote('1', { title: 'Updated Title' }));
      expect(result).toEqual(updatedNote);
      expect(offlineStorageService.saveNote).toHaveBeenCalled();
      httpMock.expectNone(`${environment.apiUrl}/api/notes/1`);
    });

    it('should mark note for deletion in offline storage', async () => {
      offlineStorageService.markForDeletion.and.returnValue(of(void 0));

      await firstValueFrom(service.deleteNote('1'));
      expect(offlineStorageService.markForDeletion).toHaveBeenCalledWith('1');
      httpMock.expectNone(`${environment.apiUrl}/api/notes/1`);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict with local version', async () => {
      const conflictedNote: Note = {
        ...testNote,
        conflictState: {
          hasConflict: true,
          serverVersion: 2,
          localVersion: 3
        }
      };

      const resolvedNote = { ...testNote, version: 2, conflictState: undefined };
      offlineStorageService.saveNote.and.returnValue(of(resolvedNote));

      const promise = firstValueFrom(service.resolveConflict(conflictedNote, 'local'));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/notes/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(resolvedNote);

      const result = await promise;
      expect(result.conflictState).toBeUndefined();
      expect(result.version).toBe(2);
    });

    it('should throw error when resolving non-existent conflict', async () => {
      const note = { ...testNote, conflictState: undefined };
      
      try {
        await firstValueFrom(service.resolveConflict(note, 'local'));
        fail('Should have thrown an error');
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).toBe('No conflict to resolve');
        } else {
          fail('Error should be an instance of Error');
        }
      }
    });
  });
}); 