import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';

export interface NetworkState {
  isOnline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  lastChecked: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private networkState = new BehaviorSubject<NetworkState>({
    isOnline: navigator.onLine,
    connectionType: this.getConnectionType(),
    effectiveType: this.getEffectiveType(),
    downlink: this.getDownlink(),
    rtt: this.getRTT(),
    lastChecked: new Date().toISOString()
  });

  private onlineEvent$ = fromEvent(window, 'online').pipe(
    map(() => true)
  );

  private offlineEvent$ = fromEvent(window, 'offline').pipe(
    map(() => false)
  );

  isOnline$ = merge(
    this.onlineEvent$,
    this.offlineEvent$,
    of(navigator.onLine)
  ).pipe(
    startWith(navigator.onLine),
    distinctUntilChanged()
  );

  constructor() {
    this.initializeNetworkListeners();
  }

  getNetworkState(): Observable<NetworkState> {
    return this.networkState.asObservable();
  }

  private initializeNetworkListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.updateNetworkState());
    window.addEventListener('offline', () => this.updateNetworkState());

    // Listen for connection changes if supported
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', 
        () => this.updateNetworkState());
    }

    // Periodic check for connection quality
    setInterval(() => this.updateNetworkState(), 30000);
  }

  private updateNetworkState() {
    this.networkState.next({
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      lastChecked: new Date().toISOString()
    });
  }

  private getConnectionType(): string | null {
    if ('connection' in navigator) {
      return (navigator as any).connection.type || null;
    }
    return null;
  }

  private getEffectiveType(): string | null {
    if ('connection' in navigator) {
      return (navigator as any).connection.effectiveType || null;
    }
    return null;
  }

  private getDownlink(): number | null {
    if ('connection' in navigator) {
      return (navigator as any).connection.downlink || null;
    }
    return null;
  }

  private getRTT(): number | null {
    if ('connection' in navigator) {
      return (navigator as any).connection.rtt || null;
    }
    return null;
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async testServerConnection(): Promise<{
    isConnected: boolean;
    latency: number;
  }> {
    const start = performance.now();
    const isConnected = await this.checkConnectivity();
    const latency = performance.now() - start;

    return {
      isConnected,
      latency: Math.round(latency)
    };
  }
} 