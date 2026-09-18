const coverCache = new Map();

export async function findCoverUrl(title, author) {
  const key = `${title}|${author}`.toLowerCase();
  if (coverCache.has(key)) return coverCache.get(key);

  try {
    const q = new URLSearchParams({ title, author, limit: "1" });
    const res = await fetch(`https://openlibrary.org/search.json?${q}`);
    if (!res.ok) throw new Error("pencarian gagal");
    const data = await res.json();
    const coverId = data.docs?.[0]?.cover_i;
    const url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
    coverCache.set(key, url);
    return url;
  } catch (e) {
    console.warn("Gagal ambil cover Open Library:", e);
    coverCache.set(key, null);
    return null;
  }
}