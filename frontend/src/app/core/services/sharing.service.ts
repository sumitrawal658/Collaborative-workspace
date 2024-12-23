import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShareSettings {
  expiresIn?: number; // Duration in hours
  requiresAuthentication?: boolean;
  allowedEmails?: string[];
  allowedDomains?: string[];
  permissions: ('read' | 'write' | 'comment')[];
}

export interface ShareLink {
  id: string;
  url: string;
  expiresAt: Date;
  settings: ShareSettings;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface ShareInvitation {
  email: string;
  documentId: string;
  permissions: ('read' | 'write' | 'comment')[];
  message?: string;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SharingService {
  constructor(private http: HttpClient) {}

  createShareLink(
    documentId: string,
    settings: ShareSettings
  ): Observable<ShareLink> {
    return this.http.post<ShareLink>(`${environment.apiUrl}/share/link`, {
      documentId,
      settings
    });
  }

  getShareLink(linkId: string): Observable<ShareLink> {
    return this.http.get<ShareLink>(`${environment.apiUrl}/share/link/${linkId}`);
  }

  revokeShareLink(linkId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/share/link/${linkId}`);
  }

  updateShareLink(
    linkId: string,
    settings: Partial<ShareSettings>
  ): Observable<ShareLink> {
    return this.http.patch<ShareLink>(`${environment.apiUrl}/share/link/${linkId}`, {
      settings
    });
  }

  sendShareInvitation(invitation: ShareInvitation): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/share/invite`, invitation);
  }

  getActiveShares(documentId: string): Observable<ShareLink[]> {
    return this.http.get<ShareLink[]>(`${environment.apiUrl}/share/document/${documentId}`);
  }

  getSharedWithMe(page: number = 1, pageSize: number = 10): Observable<{
    items: {
      documentId: string;
      title: string;
      sharedBy: {
        id: string;
        name: string;
      };
      permissions: string[];
      sharedAt: Date;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/share/with-me`, {
      params: {
        page: page.toString(),
        pageSize: pageSize.toString()
      }
    });
  }

  removeCollaborator(documentId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/share/document/${documentId}/collaborator/${userId}`
    );
  }

  updateCollaboratorPermissions(
    documentId: string,
    userId: string,
    permissions: ('read' | 'write' | 'comment')[]
  ): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/share/document/${documentId}/collaborator/${userId}`,
      { permissions }
    );
  }

  getDocumentPermissions(documentId: string): Observable<{
    canRead: boolean;
    canWrite: boolean;
    canComment: boolean;
    isOwner: boolean;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/share/document/${documentId}/permissions`);
  }
} 