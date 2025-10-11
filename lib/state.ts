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
    // Ensure processedFiles exists
    if (!this.state || !this.state.processedFiles) {
      console.warn('State or processedFiles is undefined, treating all files as new');
      return files;
    }
    
    return files.filter((file) => {
      // Check if this file has already been notified about
      if (!file || !file.id) {
        console.warn('File or file.id is undefined, skipping:', file);
        return false;
      }
      return !this.state.processedFiles[file.id];
    });
  }

  /**
   * Mark files as processed
   */
  markAsProcessed(files: FileItem[]): void {
    // Ensure state and processedFiles exist
    if (!this.state) {
      this.state = {
        lastCheck: new Date().toISOString(),
        processedFiles: {},
      };
    }
    if (!this.state.processedFiles) {
      this.state.processedFiles = {};
    }
    
    const now = new Date().toISOString();
    
    for (const file of files) {
      if (file && file.id) {
        this.state.processedFiles[file.id] = {
          name: file.name,
          clientName: file.clientName,
          notifiedAt: now,
        };
      } else {
        console.warn('Skipping file with missing id:', file);
      }
    }

    this.state.lastCheck = now;
  }

  /**
   * Clean up old entries (files older than 30 days)
   */
  cleanup(): void {
    // Ensure state and processedFiles exist
    if (!this.state || !this.state.processedFiles) {
      console.warn('State or processedFiles is undefined during cleanup');
      return;
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processedFiles = this.state.processedFiles;
    const cleanedFiles: typeof processedFiles = {};

    for (const [fileId, fileInfo] of Object.entries(processedFiles)) {
      if (fileInfo && fileInfo.notifiedAt) {
        const notifiedDate = new Date(fileInfo.notifiedAt);
        if (notifiedDate > thirtyDaysAgo) {
          cleanedFiles[fileId] = fileInfo;
        }
      }
    }

    const removedCount = Object.keys(processedFiles).length - Object.keys(cleanedFiles).length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old file entries`);
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
        const parsed = JSON.parse(storedState);
        // Ensure the parsed state has the correct structure
        this.state = {
          lastCheck: parsed.lastCheck || new Date().toISOString(),
          processedFiles: parsed.processedFiles || {},
        };
        console.log('Loaded state with', Object.keys(this.state.processedFiles).length, 'processed files');
      } catch (error) {
        console.error('Error parsing stored state:', error);
        // Keep default state if parsing fails
        console.log('Using default empty state');
      }
    } else {
      console.log('No stored state provided, using default empty state');
    }
  }

  /**
   * Export state for storage
   */
  export(): string {
    return JSON.stringify(this.state);
  }
}

