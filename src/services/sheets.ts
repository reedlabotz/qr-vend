import { type TeamMember } from './i18n';
import { googleSheetService } from './googleSheets';

export interface ClaimData {
  id?: string;
  recipientName: string;
  recipientPhone: string;
  location: 'Office' | 'Field';
  claimedBy: string;
  timestamp: string;
  url: string;
}

export interface SheetService {
  fetchNextUrl(): Promise<string | null>;
  claimUrl(data: ClaimData): Promise<void>;
  updateClaim(data: ClaimData): Promise<void>;
  claimNextUrl(data: ClaimData): Promise<string>;
  unclaimUrl(url: string): Promise<void>;
  getRecentClaims(email: string): Promise<ClaimData[]>;
  fetchTeamMembers(): Promise<TeamMember[]>;
}

class MockSheetService implements SheetService {
  private urls = [
    'https://forms.gle/qr12345',
    'https://forms.gle/qr67890',
    'https://forms.gle/qrABCDE',
    'https://forms.gle/qrFGHIJ',
  ];

  private team: TeamMember[] = [
    { name: 'John Doe', language: 'english' },
    { name: 'Maria Garcia', language: 'spanish' },
    { name: 'Jean Dupont', language: 'french' },
    { name: 'Anisur Rahman', language: 'bangla' },
  ];

  async fetchNextUrl(): Promise<string | null> {
    const claims = this.getAllClaims();
    const claimedUrls = new Set(claims.map(c => c.url));
    return this.urls.find(url => !claimedUrls.has(url)) || null;
  }

  async claimUrl(data: ClaimData): Promise<void> {
    const claims = this.getAllClaims();
    claims.unshift(data);
    localStorage.setItem('qr_vend_claims', JSON.stringify(claims));
  }

  async updateClaim(data: ClaimData): Promise<void> {
    const claims = this.getAllClaims();
    const idx = claims.findIndex(c => c.url === data.url);
    if (idx !== -1) {
      claims[idx] = data;
      localStorage.setItem('qr_vend_claims', JSON.stringify(claims));
    } else {
      await this.claimUrl(data);
    }
  }

  async claimNextUrl(data: ClaimData): Promise<string> {
    const claims = this.getAllClaims();
    const claimedUrls = new Set(claims.map(c => c.url));
    const url = this.urls.find(u => !claimedUrls.has(u));
    if (!url) throw new Error("No URLs left!");

    const finalData = { ...data, url };
    claims.unshift(finalData);
    localStorage.setItem('qr_vend_claims', JSON.stringify(claims));
    return url;
  }

  async unclaimUrl(url: string): Promise<void> {
    const claims = this.getAllClaims();
    const filtered = claims.filter(c => c.url !== url);
    localStorage.setItem('qr_vend_claims', JSON.stringify(filtered));
  }

  async getRecentClaims(name: string): Promise<ClaimData[]> {
    return this.getAllClaims().filter(c => c.claimedBy === name);
  }

  async fetchTeamMembers(): Promise<TeamMember[]> {
    return this.team;
  }

  private getAllClaims(): ClaimData[] {
    const stored = localStorage.getItem('qr_vend_claims');
    return stored ? JSON.parse(stored) : [];
  }
}

export const sheetService: SheetService = googleSheetService || new MockSheetService();
