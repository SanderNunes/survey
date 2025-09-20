export class FallbackFileManager {
  static generateDownloadLink(file, fileName) {
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);

    return { downloadLink: a, url, fileName };
  }

  static showInstructions(fileName) {
    const instructions = `
To complete the image upload:

1. Click the download button below to save: ${fileName}
2. Move the downloaded file to: your-project/public/article_images/
3. The image will then be available at: /article_images/${fileName}

Make sure the 'article_images' folder exists in your public directory.
    `;

    return instructions;
  }
}
