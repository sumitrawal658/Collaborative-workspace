import { TestBed } from '@angular/core/testing';
import { OfflineStorageService } from './offline-storage.service';
import { Note } from '../models/note.model';
import { openDB, IDBPDatabase } from 'idb';

jest.mock('idb');

describe('OfflineStorageService', () => {
  let service: OfflineStorageService;
  let mockDB: jest.Mocked<IDBPDatabase>;

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
    mockDB = {
      put: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      createObjectStore: jest.fn(),
      transaction: jest.fn(),
      objectStoreNames: {
        contains: jest.fn()
      }
    } as any;

    (openDB as jest.Mock).mockResolvedValue(mockDB);

    TestBed.configureTestingModule({
      providers: [OfflineStorageService]
    });
    service = TestBed.inject(OfflineStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize database with correct stores', async () => {
    const upgradeDB = {
      createObjectStore: jest.fn().mockReturnValue({
        createIndex: jest.fn()
      }),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false)
      }
    };

    await (openDB as jest.Mock).mock.calls[0][2].upgrade(upgradeDB);

    expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('notes', { keyPath: 'id' });
    expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('pending_changes', {
      keyPath: 'id',
      autoIncrement: true
    });
    expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('sync_meta', { keyPath: 'key' });
  });

  it('should save note to offline storage', async () => {
    await service.saveNote(mockNote);

    expect(mockDB.put).toHaveBeenCalledWith('notes', expect.objectContaining({
      id: mockNote.id,
      title: mockNote.title,
      content: mockNote.content,
      pendingSync: true
    }));

    expect(mockDB.add).toHaveBeenCalledWith('pending_changes', expect.objectContaining({
      noteId: mockNote.id,
      type: 'update'
    }));
  });

  it('should retrieve note from offline storage', async () => {
    mockDB.get.mockResolvedValue(mockNote);

    const result = await service.getNote(mockNote.id);
    expect(result).toEqual(mockNote);
    expect(mockDB.get).toHaveBeenCalledWith('notes', mockNote.id);
  });

  it('should get all notes from offline storage', async () => {
    const mockNotes = [mockNote, { ...mockNote, id: '2' }];
    mockDB.getAll.mockResolvedValue(mockNotes);

    const result = await service.getAllNotes();
    expect(result).toEqual(mockNotes);
    expect(mockDB.getAll).toHaveBeenCalledWith('notes');
  });

  it('should resolve conflicts with server version when server is newer', async () => {
    const serverNote = {
      ...mockNote,
      content: 'Server Content',
      updatedAt: new Date(Date.now() + 1000).toISOString()
    };
    const localNote = {
      ...mockNote,
      content: 'Local Content',
      updatedAt: new Date().toISOString()
    };

    const resolution = await service.resolveConflict(mockNote.id, serverNote, localNote);

    expect(resolution.strategy).toBe('server');
    expect(resolution.resolvedNote.content).toBe('Server Content');
  });

  it('should resolve conflicts with local version when local is newer', async () => {
    const serverNote = {
      ...mockNote,
      content: 'Server Content',
      updatedAt: new Date().toISOString()
    };
    const localNote = {
      ...mockNote,
      content: 'Local Content',
      updatedAt: new Date(Date.now() + 1000).toISOString()
    };

    const resolution = await service.resolveConflict(mockNote.id, serverNote, localNote);

    expect(resolution.strategy).toBe('local');
    expect(resolution.resolvedNote.content).toBe('Local Content');
  });

  it('should merge conflicts when timestamps are equal', async () => {
    const timestamp = new Date().toISOString();
    const serverNote = {
      ...mockNote,
      content: 'Server Content',
      updatedAt: timestamp
    };
    const localNote = {
      ...mockNote,
      content: 'Local Content',
      updatedAt: timestamp
    };

    const resolution = await service.resolveConflict(mockNote.id, serverNote, localNote);

    expect(resolution.strategy).toBe('merge');
    expect(resolution.resolvedNote.content).toContain('Server Content');
    expect(resolution.resolvedNote.content).toContain('Local Content');
  });

  it('should track changes between versions', async () => {
    const serverNote = {
      ...mockNote,
      content: 'Server Content',
      tags: ['server']
    };
    const localNote = {
      ...mockNote,
      content: 'Local Content',
      tags: ['local']
    };

    const resolution = await service.resolveConflict(mockNote.id, serverNote, localNote);

    expect(resolution.localChanges).toEqual({
      content: 'Local Content',
      tags: ['local']
    });
    expect(resolution.serverChanges).toEqual({
      content: 'Server Content',
      tags: ['server']
    });
  });

  it('should manage pending changes', async () => {
    const change = {
      noteId: mockNote.id,
      type: 'update',
      changes: mockNote,
      timestamp: new Date().toISOString()
    };

    await service.addPendingChange(change);
    expect(mockDB.add).toHaveBeenCalledWith('pending_changes', change);

    mockDB.getAll.mockResolvedValue([change]);
    const pendingChanges = await service.getPendingChanges();
    expect(pendingChanges).toEqual([change]);

    await service.removePendingChange(1);
    expect(mockDB.delete).toHaveBeenCalledWith('pending_changes', 1);

    await service.clearPendingChanges();
    expect(mockDB.clear).toHaveBeenCalledWith('pending_changes');
  });

  it('should manage sync metadata', async () => {
    const timestamp = new Date().toISOString();
    
    await service.updateLastSyncTimestamp();
    expect(mockDB.put).toHaveBeenCalledWith('sync_meta', {
      key: 'lastSync',
      timestamp: expect.any(String)
    });

    mockDB.get.mockResolvedValue({ timestamp });
    const lastSync = await service.getLastSyncTimestamp();
    expect(lastSync).toBe(timestamp);
  });

  it('should handle sync status updates', () => {
    const statusUpdates: string[] = [];
    service.syncStatus$.subscribe(status => statusUpdates.push(status));

    service.setSyncStatus('syncing');
    service.setSyncStatus('idle');
    service.setSyncStatus('error');

    expect(statusUpdates).toContain('syncing');
    expect(statusUpdates).toContain('idle');
    expect(statusUpdates).toContain('error');
  });
}); 