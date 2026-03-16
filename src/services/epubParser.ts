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
    manifest: Map<string, string>;
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
    const manifest = new Map<string, string>();
    const manifestMatches = content.matchAll(/<item\s+id="([^"]+)"\s+href="([^"]+)"[^>]*>/gi);
    for (const match of manifestMatches) {
      manifest.set(match[1], match[2]);
    }

    // Parse spine
    const spine: string[] = [];
    const spineMatches = content.matchAll(/<itemref\s+idref="([^"]+)"[^>]*>/gi);
    for (const match of spineMatches) {
      spine.push(match[1]);
    }

    // Get OPF directory
    const opfDir = content.match(/<package[^>]*>/)?.index !== undefined 
      ? '' 
      : '';

    return { title, author, manifest, spine, opfDir };
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

      // Step 4: Extract chapters to temp directory and build chapter list
      const chapters: EpubChapter[] = [];
      for (const idref of spine) {
        const href = manifest.get(idref);
        if (href) {
          const zipPath = `${opfDir}${href}`;
          const file = zip.file(zipPath);
          if (file) {
            const content = await file.async('text');
            const fullPath = `${extractDir}${zipPath}`;
            
            // Ensure directory exists
            const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
            await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
            
            // Write file to temp directory
            await FileSystem.writeAsStringAsync(fullPath, content, {
              encoding: FileSystem.EncodingType.UTF8,
            });

            chapters.push({
              id: idref,
              href,
              title: `Capítulo ${chapters.length + 1}`,
              fullPath,
            });
          }
        }
      }

      return {
        title,
        author,
        chapters,
        basePath: extractDir,
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
}

export const epubParser = new EpubParser();
