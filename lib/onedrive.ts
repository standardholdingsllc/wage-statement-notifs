import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  clientName: string;
  modifiedDateTime: string;
  webUrl: string;
}

export class OneDriveMonitor {
  private client: Client;
  private userEmail: string;

  constructor(accessToken: string, userEmail?: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    // Use provided email or default to /me (for delegated auth)
    this.userEmail = userEmail || 'me';
  }

  /**
   * Get all items in a folder
   */
  async getFolderContents(folderId: string): Promise<any[]> {
    try {
      console.log(`Fetching contents of folder: ${folderId}`);
      const endpoint = this.userEmail === 'me' 
        ? `/me/drive/items/${folderId}/children`
        : `/users/${this.userEmail}/drive/items/${folderId}/children`;
      
      const response = await this.client
        .api(endpoint)
        .get();
      
      console.log(`✓ Got ${response.value?.length || 0} items from folder`);
      return response.value || [];
    } catch (error: any) {
      console.error('Error getting folder contents:', error.message);
      console.error('Status code:', error.statusCode);
      console.error('Error body:', error.body);
      throw error;
    }
  }

  /**
   * Search for the "Client Folders" folder
   */
  async findClientFoldersRoot(): Promise<string | null> {
    try {
      console.log('Searching for "Client Folders" directory...');
      console.log('Using endpoint for user:', this.userEmail);
      
      const endpoint = this.userEmail === 'me'
        ? '/me/drive/root/children'
        : `/users/${this.userEmail}/drive/root/children`;
      
      const response = await this.client
        .api(endpoint)
        .filter("name eq 'Client Folders'")
        .get();
      
      console.log('Search response:', response.value?.length || 0, 'folders found');
      
      if (response.value && response.value.length > 0) {
        console.log('✓ Found "Client Folders" with ID:', response.value[0].id);
        return response.value[0].id;
      }
      
      console.error('✗ "Client Folders" directory not found');
      return null;
    } catch (error: any) {
      console.error('Error finding Client Folders:', error.message);
      console.error('Status code:', error.statusCode);
      console.error('Error body:', error.body);
      return null;
    }
  }

  /**
   * Get all client folders (subdirectories of Client Folders)
   */
  async getClientFolders(clientFoldersId: string): Promise<any[]> {
    try {
      const endpoint = this.userEmail === 'me'
        ? `/me/drive/items/${clientFoldersId}/children`
        : `/users/${this.userEmail}/drive/items/${clientFoldersId}/children`;
      
      const response = await this.client
        .api(endpoint)
        .filter('folder ne null')
        .get();
      
      return response.value || [];
    } catch (error) {
      console.error('Error getting client folders:', error);
      return [];
    }
  }

  /**
   * Check a client folder for new files (excluding the "Processed Wage Statements" folder)
   */
  async checkClientFolder(clientFolderId: string, clientName: string): Promise<FileItem[]> {
    try {
      const items = await this.getFolderContents(clientFolderId);
      const newFiles: FileItem[] = [];

      for (const item of items) {
        // Skip the "Processed Wage Statements" folder
        if (item.folder && item.name === 'Processed Wage Statements') {
          continue;
        }

        // Skip folders, only look at files
        if (item.folder) {
          continue;
        }

        // This is a file that's not in the processed folder
        newFiles.push({
          id: item.id,
          name: item.name,
          path: item.parentReference?.path || '',
          clientName: clientName,
          modifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl,
        });
      }

      return newFiles;
    } catch (error) {
      console.error(`Error checking client folder ${clientName}:`, error);
      return [];
    }
  }

  /**
   * Monitor all client folders for new files
   */
  async monitorAllClients(): Promise<FileItem[]> {
    const clientFoldersId = await this.findClientFoldersRoot();
    
    if (!clientFoldersId) {
      throw new Error('Could not find "Client Folders" directory');
    }

    const clientFolders = await this.getClientFolders(clientFoldersId);
    const allNewFiles: FileItem[] = [];

    // Check each client folder
    for (const clientFolder of clientFolders) {
      const newFiles = await this.checkClientFolder(clientFolder.id, clientFolder.name);
      allNewFiles.push(...newFiles);
    }

    return allNewFiles;
  }
}

