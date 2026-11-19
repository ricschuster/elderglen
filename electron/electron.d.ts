// A minimal local declaration of the parts of "electron" the wrapper uses, so the repo
// typechecks without the package installed (ADR 0016). Replace it with the real types when
// `npm install --save-dev electron` is run.
declare module "electron" {
  interface WebContents {
    send(channel: string, ...args: unknown[]): void;
    isDestroyed(): boolean;
    setWindowOpenHandler(fn: () => { action: "deny" }): void;
    on(
      event: "will-navigate",
      fn: (e: { preventDefault(): void; url: string }) => void,
    ): void;
  }
  interface BrowserWindowOptions {
    width: number;
    height: number;
    backgroundColor?: string;
    webPreferences: {
      preload: string;
      contextIsolation: boolean;
      nodeIntegration: boolean;
      sandbox: boolean;
    };
  }
  export class BrowserWindow {
    constructor(o: BrowserWindowOptions);
    webContents: WebContents;
    loadURL(url: string): Promise<void>;
    loadFile(path: string): Promise<void>;
  }
  export const app: {
    whenReady(): Promise<void>;
    on(event: string, fn: () => void): void;
    quit(): void;
  };
  export const ipcMain: {
    handle(ch: string, fn: (ev: unknown, ...a: unknown[]) => unknown): void;
    on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
  };
  export const ipcRenderer: {
    invoke(ch: string, ...a: unknown[]): Promise<unknown>;
    send(ch: string, ...a: unknown[]): void;
    on(ch: string, fn: (ev: unknown, ...a: unknown[]) => void): void;
    removeListener(
      ch: string,
      fn: (ev: unknown, ...a: unknown[]) => void,
    ): void;
  };
  export const contextBridge: {
    exposeInMainWorld(key: string, api: unknown): void;
  };
}
