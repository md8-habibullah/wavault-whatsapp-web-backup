// Streaming ZIP builder (fflate). Text is deflated; media (already compressed) is stored as-is.
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from 'fflate';

export function createZip() {
  const chunks = [];
  let failed = null;
  const zip = new Zip((err, chunk) => {
    if (err) failed = err;
    else if (chunk) chunks.push(chunk);
  });
  const used = new Set();

  const uniquePath = (path) => {
    let p = path;
    let i = 2;
    while (used.has(p.toLowerCase())) {
      const dot = path.lastIndexOf('.');
      p = dot > path.lastIndexOf('/') ? `${path.slice(0, dot)} (${i})${path.slice(dot)}` : `${path} (${i})`;
      i += 1;
    }
    used.add(p.toLowerCase());
    return p;
  };

  return {
    /** Adds a file and returns the path actually used (made unique if needed). */
    add(path, data, { compress = typeof data === 'string', mtime = new Date() } = {}) {
      const finalPath = uniquePath(path);
      const entry = compress ? new ZipDeflate(finalPath, { level: 6 }) : new ZipPassThrough(finalPath);
      entry.mtime = mtime;
      zip.add(entry);
      const bytes = typeof data === 'string' ? strToU8(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
      entry.push(bytes, true);
      if (failed) throw failed;
      return finalPath;
    },
    reserve: uniquePath,
    finish(mime = 'application/zip') {
      zip.end();
      if (failed) throw failed;
      return new Blob(chunks, { type: mime });
    },
  };
}
