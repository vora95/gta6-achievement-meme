// main.ts — gta6-meme-x-01 entry "Achievement Unlocked" (v3).
// Copies POST.json (the X post URL) from the repository snapshot to the
// output directory, after validating it. Nothing else it writes is judged:
// the house reads the post itself from X.
//
// The server runs this from a snapshot that may not be the working
// directory and may not set the env vars, so every location is resolved
// from a list of candidates and every read is guarded: a missing optional
// file is a note, never a crash. The only hard failures are a missing or
// invalid POST.json, a play-code mix-up, or no writable output directory.
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const PLAY_CODE = "makefun-wave-bakery-island";
const REFERRAL_CODE = "05axmjqh"; // referral, NOT a play code — never valid here
const BOUNTY_LINK = "https://make.fun/bounty/gta6-meme-x-01";
const EXPECTED_IMAGE = "meme.png";

const X_POST_RE =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/([^/]+\/status\/\d+|i\/web\/status\/\d+)/;

// Canonicalize the X post URL: strip tracking query/fragment and
// normalize the host to x.com, so a raw link copied from X (which often
// carries ?a=...&s=... params) still yields the canonical post address
// the house reads. The regex above already guarantees the shape; this
// only drops the parts after the status id.
function canonicalPostUrl(raw: string): string {
  const m = raw.match(
    /^https:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/,
  );
  if (m) return `https://x.com/${m[1]}/status/${m[2]}`;
  // i/web/status/<id> has no username to restore; strip query/fragment only.
  return raw.split(/[?#]/, 1)[0];
}

function readTextIfExists(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readBytesIfExists(filePath: string): Buffer | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function isDir(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

// Find the repository snapshot: env first, then the working directory,
// then the harness convention /bot. Prefer a candidate that holds
// POST.json; fall back to the first existing directory so the error
// below can say exactly what is missing.
function findSnapshotDir(): string | null {
  const candidates = [process.env.MAKEFUN_BOT_DIR, ".", "/bot"].filter(
    (c): c is string => typeof c === "string" && c.length > 0,
  );
  for (const dir of candidates) {
    if (isDir(dir) && fs.existsSync(path.join(dir, "POST.json"))) return dir;
  }
  for (const dir of candidates) {
    if (isDir(dir)) return dir;
  }
  return null;
}

// Find a writable output directory: env first, then the harness
// convention /output, then out/ under the snapshot. mkdir is single
// level only and only when the parent exists, so a bad path fails fast
// instead of hanging on a recursive create.
function findOutputDir(snapshotDir: string): string | null {
  const candidates: string[] = [];
  if (process.env.MAKEFUN_OUTPUT_DIR) {
    candidates.push(process.env.MAKEFUN_OUTPUT_DIR);
  }
  candidates.push("/output");
  candidates.push(path.join(snapshotDir, "out"));
  for (const dir of candidates) {
    try {
      const parent = path.dirname(dir);
      if (!fs.existsSync(parent)) continue;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      if (isDir(dir)) return dir;
    } catch {
      continue;
    }
  }
  return null;
}

function pngSize(buf: Buffer): { width: number; height: number } | null {
  // Minimal PNG header parse: 8-byte signature + IHDR chunk.
  if (buf.length < 33) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    return null;
  }
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function main(): number {
  const notes: string[] = [];
  const snapshotDir = findSnapshotDir();
  if (snapshotDir === null) {
    console.error(
      "no snapshot directory found among MAKEFUN_BOT_DIR, '.', '/bot'",
    );
    return 1;
  }

  const postRaw = readTextIfExists(path.join(snapshotDir, "POST.json"));
  if (postRaw === null) {
    console.error(`POST.json not found under ${snapshotDir}`);
    return 1;
  }
  let postUrl: string;
  try {
    const parsed: unknown = JSON.parse(postRaw);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("POST.json is not an object");
    }
    const url = (parsed as { url?: unknown }).url;
    if (typeof url !== "string") throw new Error("POST.json has no url string");
    postUrl = url;
  } catch (err) {
    console.error(`POST.json unreadable: ${(err as Error).message}`);
    return 1;
  }
  if (!X_POST_RE.test(postUrl)) {
    console.error(`POST.json url is not an X post URL: ${postUrl}`);
    return 1;
  }
  postUrl = canonicalPostUrl(postUrl);

  // Caption checks are advisory only: the post on X is what is judged.
  const caption = readTextIfExists(path.join(snapshotDir, "CAPTION.txt"));
  if (caption === null) {
    notes.push("CAPTION.txt not found (advisory only)");
  } else {
    const text = caption.trim();
    if (text.length > 280) {
      notes.push(`caption is ${text.length} chars (over 280, advisory only)`);
    }
    if (!text.includes("@makefunai")) notes.push("caption lacks @makefunai");
    if (!text.includes(BOUNTY_LINK)) notes.push("caption lacks bounty link");
    if (!text.includes(PLAY_CODE)) notes.push("caption lacks play code");
    if (text.includes(REFERRAL_CODE)) {
      // The referral code is not a play code. A caption carrying it as
      // the play code would fail the gate, so refuse loudly here.
      console.error(
        `caption uses referral code ${REFERRAL_CODE} as a play code`,
      );
      return 1;
    }
  }

  // Image check is advisory only: the house reads the picture from X.
  const image = readBytesIfExists(path.join(snapshotDir, EXPECTED_IMAGE));
  if (image === null) {
    notes.push(`${EXPECTED_IMAGE} not found (advisory only)`);
  } else {
    const size = pngSize(image);
    if (size === null) {
      notes.push(`${EXPECTED_IMAGE} is not a readable PNG (advisory only)`);
    } else {
      notes.push(
        `${EXPECTED_IMAGE} ${size.width}x${size.height} ` +
          `sha256=${crypto.createHash("sha256").update(image).digest("hex")}`,
      );
      if (size.width !== 1600 || size.height !== 1600) {
        notes.push(`${EXPECTED_IMAGE} is not 1600x1600 (advisory only)`);
      }
    }
  }

  const outputDir = findOutputDir(snapshotDir);
  if (outputDir === null) {
    console.error(
      "no writable output directory among MAKEFUN_OUTPUT_DIR, '/output', '<snapshot>/out'",
    );
    return 1;
  }
  const outPath = path.join(outputDir, "POST.json");
  fs.writeFileSync(outPath, JSON.stringify({ url: postUrl }, null, 2) + "\n");
  console.log(
    JSON.stringify({ ok: true, url: postUrl, out: outPath, notes }, null, 2),
  );
  return 0;
}

process.exit(main());
