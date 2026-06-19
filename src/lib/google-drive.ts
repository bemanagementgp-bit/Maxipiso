export function extractGoogleDriveFileId(input: string) {
  const value = input.trim();

  if (!value) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const idFromQuery = url.searchParams.get("id");

    if (idFromQuery) {
      return idFromQuery;
    }

    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function toGoogleDrivePreviewUrl(input: string) {
  const fileId = extractGoogleDriveFileId(input);

  if (!fileId) {
    return input.trim();
  }

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function isRemoteImageUrl(url: string | undefined) {
  return !!url && /^https?:\/\//i.test(url);
}