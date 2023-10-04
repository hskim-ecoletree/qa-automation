
export function isPageUrl(url: string): boolean {
    return url.startsWith("http");
}

export function isResourceUrl(url: string): boolean {
    return !isPageUrl(url);
}

export function findUrlPatternsFromText(text: string): string[] {
    const urlPattern = /https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
    return text.match(urlPattern);
}

export function findUrlFromCss(cssText: string): string[] {
    const urlPattern = /url\(['"]?(.*?)['"]?\)/g;
    const urls = cssText.match(urlPattern)
        .map(str => str
            .replace(/^url\(['"]?/gi, "")
            .replace(/['"]?\)$/g, "")
        );
    return [...findUrlPatternsFromText(cssText), ...urls];
}

export const NonPageUrlPatterns = [
    ...ResourceUrlPatterns,
    ...ImageUrlPatterns,
    ...VideoUrlPatterns,
    ...AudioUrlPatterns,
    ...FileUrlPatterns,
];

export const ResourceUrlPatterns = [
    /\.css$/,
    /\.scss$/,
    /\.js$/,
    /\.jsx$/,
    /\.map$/,
    /\.json$/,
    /\.ts$/gi,
    /\.tsx$/gi,
];

export const ImageUrlPatterns = [
    /\.jpg$/gi,
    /\.jpeg$/gi,
    /\.png$/gi,
    /\.gif$/gi,
    /\.svg$/gi,
    /\.ico$/gi,
    /\.bmp$/gi,
    /\.tiff$/gi,
    /\.webp$/gi,
    /\.avif$/gi,
    /\.jfif$/gi,
];

export const VideoUrlPatterns = [
    /\.mp4$/gi,
    /\.webm$/gi,
    /\.avi$/gi,
    /\.mov$/gi,
    /\.wmv$/gi,
    /\.flv$/gi,
    /\.mkv$/gi,
    /\.m4v$/gi,
];

export const AudioUrlPatterns = [
    /\.mp3$/gi,
];

export const FileUrlPatterns = [
    /\.zip$/gi,
    /\.rar$/gi,
    /\.tar$/gi,
    /\.gz$/gi,
    /\.7z$/gi,
    /\.pdf$/gi,
    /\.doc$/gi,
    /\.docx$/gi,
    /\.xls$/gi,
    /\.xlsx$/gi,
    /\.ppt$/gi,
    /\.pptx$/gi,
    /\.txt$/gi,
    /\.csv$/gi,
    /\.tsv$/gi,
];

