import { FileItem } from './onedrive';

export interface StateData {
  lastCheck: string;
  processedFiles: {
    [fileId: string]: {
      name: string;
      clientName: string;
      notifiedAt: string;
    };
  };
}

/**
 * Simple file-based state management
 * For production, consider using Vercel KV, Redis, or a database
 */
export class StateManager {
  private state: StateData;

  constructor() {
    this.state = {
      lastCheck: new Date().toISOString(),
      processedFiles: {},
    };
  }

  /**
   * Filter out files that have already been processed
   */
  filterNewFiles(files: FileItem[]): FileItem[] {
    return files.filter((file) => {
      // Check if this file has already been notified about
      return !this.state.processedFiles[file.id];
    });
  }

  /**
   * Mark files as processed
   */
  markAsProcessed(files: FileItem[]): void {
    const now = new Date().toISOString();
    
    for (const file of files) {
      this.state.processedFiles[file.id] = {
        name: file.name,
        clientName: file.clientName,
        notifiedAt: now,
      };
    }

    this.state.lastCheck = now;
  }

  /**
   * Clean up old entries (files older than 30 days)
   */
  cleanup(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processedFiles = this.state.processedFiles;
    const cleanedFiles: typeof processedFiles = {};

    for (const [fileId, fileInfo] of Object.entries(processedFiles)) {
      const notifiedDate = new Date(fileInfo.notifiedAt);
      if (notifiedDate > thirtyDaysAgo) {
        cleanedFiles[fileId] = fileInfo;
      }
    }

    this.state.processedFiles = cleanedFiles;
  }

  /**
   * Get current state
   */
  getState(): StateData {
    return this.state;
  }

  /**
   * Load state from external source (implement based on your storage solution)
   */
  async load(storedState?: string): Promise<void> {
    if (storedState) {
      try {
        this.state = JSON.parse(storedState);
      } catch (error) {
        console.error('Error parsing stored state:', error);
      }
    }
  }

  /**
   * Export state for storage
   */
  export(): string {
    return JSON.stringify(this.state);
  }
}

