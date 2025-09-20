export class FileSystemManager {
  static async checkFileSystemAccess() {
    return 'showDirectoryPicker' in window;
  }

  static async requestPublicFolderAccess() {
    try {
      // Request access to the public folder
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Store the handle for later use
      localStorage.setItem('publicFolderHandle', JSON.stringify({
        name: directoryHandle.name,
        timestamp: Date.now()
      }));

      return directoryHandle;
    } catch (error) {
      console.error('Failed to get directory access:', error);
      return null;
    }
  }

  static async getOrCreateArticleImagesFolder(publicHandle) {
    try {
      // Try to get existing article_images folder
      let articleImagesHandle;
      try {
        articleImagesHandle = await publicHandle.getDirectoryHandle('article_images');
      } catch {
        // Create article_images folder if it doesn't exist
        articleImagesHandle = await publicHandle.getDirectoryHandle('article_images', {
          create: true
        });
      }
      return articleImagesHandle;
    } catch (error) {
      console.error('Failed to create/access article_images folder:', error);
      return null;
    }
  }

  static generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    const extension = sanitizedName.split('.').pop();
    const nameWithoutExt = sanitizedName.replace(`.${extension}`, '');

    return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`;
  }

  static async saveImageToPublicFolder(file, publicHandle) {
    try {
      const articleImagesHandle = await this.getOrCreateArticleImagesFolder(publicHandle);
      if (!articleImagesHandle) return null;

      const fileName = this.generateUniqueFileName(file.name);

      // Create file in article_images folder
      const fileHandle = await articleImagesHandle.getFileHandle(fileName, {
        create: true
      });

      // Write file content
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      return `/article_images/${fileName}`;
    } catch (error) {
      console.error('Failed to save image:', error);
      return null;
    }
  }
} 
