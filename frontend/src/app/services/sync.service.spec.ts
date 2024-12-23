import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SyncService } from './sync.service';
import { NetworkService } from './network.service';
import { OfflineStorageService } from './offline-storage.service';
import { Note } from '../models/note.model';

describe('SyncService', () => {
  let service: SyncService;
  let httpMock: HttpTestingController;
  let networkService: NetworkService;
  let offlineStorage: OfflineStorageService;

  const mockNote: Note = {
    id: '1',
    title: 'Test Note',
    content: 'Test Content',
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['test'],
    collaborators: [],
    metadata: {}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SyncService,
        NetworkService,
        {
          provide: OfflineStorageService,
          useValue: {
            getPendingChanges: jest.fn(),
            getNote: jest.fn(),
            updateLastSyncTimestamp: jest.fn(),
            removePendingChange: jest.fn(),
            addPendingChange: jest.fn(),
            resolveConflict: jest.fn()
          }
        }
      ]
    });

    service = TestBed.inject(SyncService);
    httpMock = TestBed.inject(HttpTestingController);
    networkService = TestBed.inject(NetworkService);
    offlineStorage = TestBed.inject(OfflineStorageService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with idle sync status', () => {
    service.getSyncStatus().subscribe(status => {
      expect(status.status).toBe('idle');
      expect(status.progress).toBe(0);
      expect(status.total).toBe(0);
    });
  });

  it('should not sync when already syncing', async () => {
    // Set initial state to syncing
    service['syncStatus'].next({
      status: 'syncing',
      progress: 1,
      total: 2,
      lastSync: new Date().toISOString()
    });

    await service.syncNow();
    expect(offlineStorage.getPendingChanges).not.toHaveBeenCalled();
  });

  it('should handle empty pending changes', async () => {
    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue([]);
    await service.syncNow();
    expect(offlineStorage.updateLastSyncTimestamp).not.toHaveBeenCalled();
  });

  it('should process pending changes successfully', async () => {
    const changes = [
      {
        id: 1,
        noteId: '1',
        type: 'update',
        changes: mockNote
      }
    ];

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(offlineStorage, 'getNote').mockResolvedValue(mockNote);
    jest.spyOn(service as any, 'fetchServerNote').mockResolvedValue(null);
    jest.spyOn(service as any, 'saveToServer').mockResolvedValue(undefined);

    await service.syncNow();

    expect(offlineStorage.removePendingChange).toHaveBeenCalledWith(1);
    expect(offlineStorage.updateLastSyncTimestamp).toHaveBeenCalled();
  });

  it('should handle sync errors', async () => {
    const error = new Error('Sync failed');
    jest.spyOn(offlineStorage, 'getPendingChanges').mockRejectedValue(error);

    await service.syncNow();

    service.getSyncStatus().subscribe(status => {
      expect(status.status).toBe('error');
      expect(status.error).toBe('Sync failed');
    });
  });

  it('should handle conflicts during sync', async () => {
    const serverNote = { ...mockNote, content: 'Server Content' };
    const localNote = { ...mockNote, content: 'Local Content' };
    const resolvedNote = { ...mockNote, content: 'Resolved Content' };

    const changes = [
      {
        id: 1,
        noteId: '1',
        type: 'update',
        changes: localNote
      }
    ];

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(offlineStorage, 'getNote').mockResolvedValue(localNote);
    jest.spyOn(service as any, 'fetchServerNote').mockResolvedValue(serverNote);
    jest.spyOn(offlineStorage, 'resolveConflict').mockResolvedValue({
      resolvedNote,
      strategy: 'merge',
      localChanges: {},
      serverChanges: {}
    });

    await service.syncNow();

    expect(offlineStorage.resolveConflict).toHaveBeenCalledWith('1', serverNote, localNote);
    expect(offlineStorage.removePendingChange).toHaveBeenCalledWith(1);
  });

  it('should retry failed changes', async () => {
    const changes = [
      {
        id: 1,
        noteId: '1',
        type: 'update',
        changes: mockNote,
        retryCount: 1
      }
    ];

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(service as any, 'processChange').mockRejectedValue(new Error('Failed'));

    await service.syncNow();

    expect(offlineStorage.removePendingChange).toHaveBeenCalledWith(1);
    expect(offlineStorage.addPendingChange).toHaveBeenCalledWith(expect.objectContaining({
      retryCount: 2
    }));
  });

  it('should handle permanently failed changes', async () => {
    const changes = [
      {
        id: 1,
        noteId: '1',
        type: 'update',
        changes: mockNote,
        retryCount: 3
      }
    ];

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(service as any, 'processChange').mockRejectedValue(new Error('Failed'));

    await service.syncNow();

    expect(offlineStorage.removePendingChange).toHaveBeenCalledWith(1);
    expect(offlineStorage.addPendingChange).not.toHaveBeenCalled();
  });

  it('should update sync progress correctly', async () => {
    const changes = [
      { id: 1, noteId: '1', type: 'update', changes: mockNote },
      { id: 2, noteId: '2', type: 'update', changes: mockNote }
    ];

    const progressUpdates: number[] = [];
    service.getSyncStatus().subscribe(status => {
      progressUpdates.push(status.progress);
    });

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(service as any, 'processChange').mockResolvedValue(undefined);

    await service.syncNow();

    expect(progressUpdates).toContain(0); // Initial
    expect(progressUpdates).toContain(1); // After first change
    expect(progressUpdates).toContain(2); // After second change
  });

  it('should handle HTTP errors during sync', async () => {
    const changes = [
      { id: 1, noteId: '1', type: 'update', changes: mockNote }
    ];

    jest.spyOn(offlineStorage, 'getPendingChanges').mockResolvedValue(changes);
    jest.spyOn(service as any, 'fetchServerNote').mockResolvedValue(null);

    await service.syncNow();

    const req = httpMock.expectOne(`/api/notes/${mockNote.id}`);
    req.error(new ErrorEvent('Network error'));

    expect(offlineStorage.removePendingChange).toHaveBeenCalledWith(1);
  });
}); 