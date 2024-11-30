// src/index.ts
class SteamSearchExtension {
  isActive = false;
  manifest;
  searchTimeout = null;
  lastQuery = "";
  steamApps = [];
  async getSteamApps(useCache = true) {
    if (useCache && this.steamApps.length > 0) {
      return this.steamApps;
    }
    const response = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://api.steampowered.com/ISteamApps/GetAppList/v0002/"));
    const data = await response.json();
    this.steamApps = data.applist.apps;
    return this.steamApps;
  }
  async activate() {
    this.isActive = true;
    console.log("Steam search extension activated");
  }
  async deactivate() {
    this.isActive = false;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    console.log("Steam search extension deactivated");
  }
  async startBackground() {
    return;
  }
  async stopBackground() {
    return;
  }
  async handleText(text) {
    return;
  }
  handleSystemEvent(event) {
  }
  async search(query) {
    if (!this.isActive || !query.startsWith(":steam ")) {
      return [];
    }
    const searchTerm = query.replace(":steam ", "").toLowerCase().trim();
    if (!searchTerm)
      return [];
    if (searchTerm === this.lastQuery)
      return [];
    return new Promise((resolve) => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(async () => {
        this.lastQuery = searchTerm;
        try {
          console.log("Searching for Steam:", searchTerm);
          const steamApps = await this.getSteamApps(true);
          const filteredSteamApps = steamApps?.filter((app) => app.name.toLowerCase().includes(searchTerm));
          console.log("Found Steam:", filteredSteamApps);
          if ((filteredSteamApps ?? []).length > 0) {
            resolve(filteredSteamApps?.map((app) => ({
              id: `steam-${app.appid}`,
              title: app.name,
              subtitle: `App ID: ${app.appid}`,
              action: {
                type: "Simple",
                command: `steam.view.${app.appid}`
              }
            })) ?? []);
          } else {
            resolve([]);
          }
        } catch (error) {
          console.error("Failed to fetch steam:", error);
          resolve([{
            id: "steam-error",
            title: "Error searching Steam",
            subtitle: error instanceof Error ? error.message : "Unknown error",
            icon: "\u26A0\uFE0F",
            action: {
              type: "Simple",
              command: "steam.search"
            }
          }]);
        }
      }, 300);
    });
  }
}
export {
  SteamSearchExtension as default
};
