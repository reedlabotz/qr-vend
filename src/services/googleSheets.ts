import { type ClaimData, type SheetService } from './sheets';
import { type TeamMember, type Language } from './i18n';

declare const google: any;

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const SECRET_TOKEN = import.meta.env.VITE_SECRET_TOKEN;

/**
 * Hybrid Service:
 * 1. Uses google.script.run when hosted as a Google Web App (fastest & native).
 * 2. Uses fetch() when running locally (development mode).
 */
class GoogleSheetService implements SheetService {
    private scriptUrl: string | undefined;
    private token: string | undefined;

    constructor(url?: string, token?: string) {
        this.scriptUrl = url;
        this.token = token;
    }

    // Helper to detect if we're in the Apps Script environment
    private isGoogleEnv(): boolean {
        // @ts-ignore
        return typeof google !== 'undefined' && google.script && google.script.run;
    }

    // Wrapper for google.script.run or fetch
    private async callgs(functionName: string, ...args: any[]): Promise<any> {
        if (this.isGoogleEnv()) {
            return new Promise((resolve, reject) => {
                // @ts-ignore
                google.script.run
                    .withSuccessHandler(resolve)
                    .withFailureHandler(reject)[functionName](...args);
            });
        }

        if (!this.scriptUrl) {
            throw new Error("No VITE_APPS_SCRIPT_URL provided for local connection.");
        }

        // Local fetch fallback
        const isPost = ['gsClaimUrl', 'gsUnclaimUrl'].includes(functionName);
        const url = new URL(this.scriptUrl);
        url.searchParams.set('token', this.token || '');

        if (isPost) {
            const res = await fetch(url.toString(), {
                method: 'POST',
                body: JSON.stringify({
                    action: functionName.replace('gs', '').toLowerCase(),
                    token: this.token,
                    ...(functionName === 'gsClaimUrl' ? { claim: args[0] } : { url: args[0] })
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            return await res.json();
        } else {
            url.searchParams.set('action', functionName.replace('gs', '').toLowerCase());
            if (functionName === 'gsGetRecentClaims') url.searchParams.set('user', args[0]);

            const res = await fetch(url.toString());
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        }
    }

    async fetchNextUrl(): Promise<string | null> {
        const data = await this.callgs('gsFetchNextUrl');
        // Fetch mode returns {urls: [...]}, Apps Script mode returns the url string directly
        if (data && typeof data === 'object' && data.urls) {
            const unclaimed = data.urls.find((r: any) => !r.claimedBy);
            return unclaimed ? unclaimed.url : null;
        }
        return data;
    }

    async claimUrl(claim: ClaimData): Promise<void> {
        await this.callgs('gsClaimUrl', claim);
    }

    async updateClaim(claim: ClaimData): Promise<void> {
        await this.callgs('gsUpdateClaim', claim);
    }

    async unclaimUrl(url: string): Promise<void> {
        await this.callgs('gsUnclaimUrl', url);
    }

    async getRecentClaims(name: string): Promise<ClaimData[]> {
        const data = await this.callgs('gsGetRecentClaims', name);
        return data.claims || data;
    }

    async fetchTeamMembers(): Promise<TeamMember[]> {
        const data = await this.callgs('gsGetTeam');
        const teamList = data.team || data;
        return teamList.map((m: any) => ({
            name: m.name,
            language: (m.language || 'english').toLowerCase() as Language
        }));
    }
}

export const googleSheetService = (SCRIPT_URL || (typeof google !== 'undefined'))
    ? new GoogleSheetService(SCRIPT_URL, SECRET_TOKEN)
    : null;
