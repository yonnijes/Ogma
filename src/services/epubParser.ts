import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';

export interface EpubChapter {
  id: string;
  href: string;
  title: string;
  fullPath: string;
}

export interface EpubBook {
  title: string;
  author: string;
  chapters: EpubChapter[];
  basePath: string;
  images: Map<string, string>; // zipPath -> localPath
}

class EpubParser {
  private async readEpubAsZip(epubPath: string): Promise<JSZip> {
    const base64 = await FileSystem.readAsStringAsync(epubPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return await JSZip.loadAsync(base64, { base64: true });
  }

  private async parseContainerXml(content: string): Promise<string> {
    const match = content.match(/full-path="([^"]+)"/);
    if (match) {
      return match[1];
    }
    throw new Error('No se pudo encontrar el archivo OPF en container.xml');
  }

  private parseOpf(content: string): {
    title: string;
    author: string;
    manifest: Map<string, { href: string; mediaType: string }>;
    spine: string[];
    opfDir: string;
  } {
    // Extract title
    const titleMatch = content.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Sin título';

    // Extract author
    const authorMatch = content.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    const author = authorMatch ? authorMatch[1].trim() : 'Desconocido';

    // Parse manifest
    const manifest = new Map<string, { href: string; mediaType: string }>();
    const manifestMatches = content.matchAll(
      /<item\s+id="([^"]+)"\s+href="([^"]+)"\s+media-type="([^"]+)"[^>]*>/gi
    );
    for (const match of manifestMatches) {
      manifest.set(match[1], { href: match[2], mediaType: match[3] });
    }

    // Parse spine
    const spine: string[] = [];
    const spineMatches = content.matchAll(/<itemref\s+idref="([^"]+)"[^>]*>/gi);
    for (const match of spineMatches) {
      spine.push(match[1]);
    }

    return { title, author, manifest, spine, opfDir: '' };
  }

  private async parseChapterHtml(content: string): Promise<string> {
    // Extract body content
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }
    
    // If no body tag, return entire content
    return content;
  }

  async parse(epubPath: string): Promise<EpubBook> {
    const extractDir = `${FileSystem.documentDirectory}epub_temp_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

    try {
      // Step 1: Load ZIP
      const zip = await this.readEpubAsZip(epubPath);

      // Step 2: Read container.xml
      const containerContent = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerContent) {
        throw new Error('No se encontró container.xml');
      }
      const opfRelativePath = await this.parseContainerXml(containerContent);
      
      // Step 3: Parse OPF
      const opfContent = await zip.file(opfRelativePath)?.async('text');
      if (!opfContent) {
        throw new Error(`No se encontró ${opfRelativePath}`);
      }
      const { title, author, manifest, spine } = this.parseOpf(opfContent);
      const opfDir = opfRelativePath.substring(0, opfRelativePath.lastIndexOf('/') + 1);

      // Step 4: Extract all files to temp directory
      const images = new Map<string, string>();
      const chapters: EpubChapter[] = [];

      for (const [idref] of spine.entries()) {
        const id = spine[idref];
        const item = manifest.get(id);
        if (!item) continue;

        const zipPath = `${opfDir}${item.href}`;
        const file = zip.file(zipPath);
        if (!file) continue;

        // Check if it's an image
        const isImage = item.mediaType.startsWith('image/');
        
        // Ensure directory exists
        const fullPath = `${extractDir}${zipPath}`;
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

        if (isImage) {
          // Extract image as binary
          const blob = await file.async('blob');
          const reader = new FileReader();
          
          // For React Native, we need to use base64
          const base64 = await file.async('base64');
          const ext = item.mediaType.split('/')[1] || 'png';
          const localPath = `${extractDir}${zipPath}`;
          
          await FileSystem.writeAsStringAsync(localPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          images.set(zipPath, localPath);
        } else {
          // Extract text file (chapter)
          const content = await file.async('text');
          await FileSystem.writeAsStringAsync(fullPath, content, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        }

        // If it's a chapter (XHTML/HTML), add to chapters list
        if (item.mediaType.includes('html') || item.mediaType.includes('xhtml')) {
          chapters.push({
            id,
            href: item.href,
            title: `Capítulo ${chapters.length + 1}`,
            fullPath,
          });
        }
      }

      return {
        title,
        author,
        chapters,
        basePath: extractDir,
        images,
      };
    } catch (error) {
      console.error('Error parsing EPUB:', error);
      throw error;
    }
  }

  async cleanup(basePath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(basePath, { idempotent: true });
    } catch (error) {
      console.warn('Error cleaning up EPUB temp files:', error);
    }
  }

  async parseChapterHtml(fullPath: string): Promise<string> {
    const content = await FileSystem.readAsStringAsync(fullPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return this.parseChapterHtml(content);
  }

  async getImageLocalPath(zipPath: string, images: Map<string, string>): Promise<string | null> {
    return images.get(zipPath) || null;
  }
}

export const epubParser = new EpubParser();
