import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkService]
    });
    service = TestBed.inject(NetworkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with correct online status', () => {
    const networkState = service.getNetworkState();
    networkState.subscribe(state => {
      expect(state.isOnline).toBe(navigator.onLine);
    });
  });

  it('should detect online status changes', fakeAsync(() => {
    const onlineStates: boolean[] = [];
    service.isOnline$.subscribe(state => onlineStates.push(state));

    // Simulate online event
    window.dispatchEvent(new Event('online'));
    tick();
    expect(onlineStates).toContain(true);

    // Simulate offline event
    window.dispatchEvent(new Event('offline'));
    tick();
    expect(onlineStates).toContain(false);
  }));

  it('should update network state on connection change', fakeAsync(() => {
    const states: any[] = [];
    service.getNetworkState().subscribe(state => states.push(state));

    // Mock connection change
    if ('connection' in navigator) {
      const mockConnection = {
        type: '4g',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50
      };
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true
      });

      // Simulate connection change
      (navigator as any).connection.dispatchEvent(new Event('change'));
      tick();

      const latestState = states[states.length - 1];
      expect(latestState.connectionType).toBe('4g');
      expect(latestState.effectiveType).toBe('4g');
      expect(latestState.downlink).toBe(10);
      expect(latestState.rtt).toBe(50);
    }
  }));

  it('should check connectivity with server', async () => {
    // Mock fetch response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true
      } as Response)
    );

    const isConnected = await service.checkConnectivity();
    expect(isConnected).toBe(true);

    // Test failed connection
    global.fetch = jest.fn(() => Promise.reject('Network error'));
    const isDisconnected = await service.checkConnectivity();
    expect(isDisconnected).toBe(false);
  });

  it('should measure server connection latency', async () => {
    // Mock performance.now()
    const originalNow = performance.now;
    performance.now = jest.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100);

    // Mock successful connection
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true
      } as Response)
    );

    const result = await service.testServerConnection();
    expect(result.isConnected).toBe(true);
    expect(result.latency).toBe(100);

    // Restore original performance.now
    performance.now = originalNow;
  });

  it('should handle periodic network state updates', fakeAsync(() => {
    const states: any[] = [];
    service.getNetworkState().subscribe(state => states.push(state));

    // Fast-forward 30 seconds
    tick(30000);
    expect(states.length).toBeGreaterThan(1);

    // Each state should have a different lastChecked timestamp
    const timestamps = states.map(state => state.lastChecked);
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(states.length);
  }));

  it('should handle connection type changes', fakeAsync(() => {
    const states: any[] = [];
    service.getNetworkState().subscribe(state => states.push(state));

    if ('connection' in navigator) {
      // Simulate connection type changes
      const connectionTypes = ['4g', '3g', 'wifi'];
      connectionTypes.forEach(type => {
        Object.defineProperty(navigator.connection, 'type', {
          value: type,
          configurable: true
        });
        (navigator as any).connection.dispatchEvent(new Event('change'));
        tick();
      });

      const types = states.map(state => state.connectionType);
      expect(types).toContain('4g');
      expect(types).toContain('3g');
      expect(types).toContain('wifi');
    }
  }));
}); 