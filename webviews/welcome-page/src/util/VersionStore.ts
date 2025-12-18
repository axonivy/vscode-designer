type Listener = () => void;

let version: string;
let listeners: Array<Listener> = [];

export const VersionStore = {
  setVersion(newVersion: string) {
    version = newVersion;
    listeners.forEach(l => l());
  },

  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  getVersion() {
    return version;
  }
};
