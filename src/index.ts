// Use relative path to types file or create a local types.d.ts
import type { ExtensionInterface, ExtensionManifest, SearchResult, SystemEvent } from '../../src/lib/types/extensions.ts';

export default class SteamSearchExtension implements ExtensionInterface {
    isActive = false;
    manifest!: ExtensionManifest;
    private searchTimeout: any | null = null;
    private lastQuery = '';


    private steamApps: {appid: number, name: string}[] = [];

    // Make a request to the SteamAPI to get SteamApps from 'https://api.steampowered.com/ISteamApps/GetAppList/v0002/' and cache the result
    async getSteamApps(useCache: boolean = true) {
        if (useCache && this.steamApps.length > 0) {
            return this.steamApps;
        }
        
        // Using a CORS proxy service (for development/example only)
        const response = await fetch('https://api.allorigins.win/raw?url=' + 
            encodeURIComponent('https://api.steampowered.com/ISteamApps/GetAppList/v0002/'));
        const data = await response.json();
        this.steamApps = data.applist.apps;
        return this.steamApps;
    }

    async activate(): Promise<void> {
        this.isActive = true;
        console.log("Steam search extension activated");
    }

    async deactivate(): Promise<void> {
        this.isActive = false;
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        console.log("Steam search extension deactivated");
    }

    async startBackground(): Promise<void> {
        // No background tasks needed
        return;
    }

    async stopBackground(): Promise<void> {
        // No background tasks needed
        return;
    }

    async handleText(text: string): Promise<string | undefined> {
        // No text handling needed
        return undefined;
    }

    handleSystemEvent(event: SystemEvent): void {
        // No system event handling needed
    }

    async search(query: string): Promise<SearchResult[]> {
        if (!this.isActive || !query.startsWith(':steam ')) {
            return [];
        }

        const searchTerm = query.replace(':steam ', '').toLowerCase().trim();
        if (!searchTerm) return [];
        if (searchTerm === this.lastQuery) return []; // Skip if same query

        // Return a promise that resolves after debounce
        return new Promise((resolve) => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            this.searchTimeout = setTimeout(async () => {
                this.lastQuery = searchTerm;
                try {
                    console.log('Searching for Steam:', searchTerm);
                    const steamApps = await this.getSteamApps(true);
                    
                    // Filter the steamApps by the searchTerm
                    const filteredSteamApps = steamApps?.filter((app) => app.name.toLowerCase().includes(searchTerm));
                    console.log('Found Steam:', filteredSteamApps);

                    if ((filteredSteamApps ?? []).length > 0) {
                        resolve((filteredSteamApps?.map((app) => ({
                            id: `steam-${app.appid}`,
                            title: app.name,
                            subtitle: `App ID: ${app.appid}`,
                            action: {
                                type: 'Simple',
                                command: `steam.view.${app.appid}`
                            }
                        }))) ?? []);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    console.error('Failed to fetch steam:', error);
                    resolve([{
                        id: 'steam-error',
                        title: 'Error searching Steam',
                        subtitle: error instanceof Error ? error.message : 'Unknown error',
                        icon: '⚠️',
                        action: {
                            type: 'Simple',
                            command: 'steam.search'
                        }
                    }]);
                }
            }, 300); // 300ms debounce
        });
    }
}