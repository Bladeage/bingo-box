// Teilen ohne Server: die komplette Konfiguration steckt im URL-Fragment.
// Das Fragment wird nie an einen Server geschickt — eigene Begriffe bleiben zwischen
// den Leuten, die den Link haben.

const B64_TO_URL = { "+": "-", "/": "_" };
const URL_TO_B64 = { "-": "+", _: "/" };

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/[+/]/g, (c) => B64_TO_URL[c]).replace(/=+$/, "");
}

function base64UrlToBytes(text) {
  const padded = text.replace(/[-_]/g, (c) => URL_TO_B64[c]).padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function squeeze(bytes, mode) {
  const Stream = mode === "deflate" ? globalThis.CompressionStream : globalThis.DecompressionStream;
  if (!Stream) return null; // ältere Browser: wir teilen dann unkomprimiert
  const stream = new Blob([bytes]).stream().pipeThrough(new Stream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Konfiguration -> Fragment-Wert. `z` = komprimiert, `p` = unkomprimiert. */
export async function encodeConfig(config) {
  const raw = new TextEncoder().encode(JSON.stringify(config));
  const packed = await squeeze(raw, "deflate");
  return packed && packed.length < raw.length
    ? "z" + bytesToBase64Url(packed)
    : "p" + bytesToBase64Url(raw);
}

export async function decodeConfig(value) {
  if (!value || value.length < 2) return null;
  try {
    const bytes = base64UrlToBytes(value.slice(1));
    const raw = value[0] === "z" ? await squeeze(bytes, "inflate") : bytes;
    if (!raw) return null;
    const config = JSON.parse(new TextDecoder().decode(raw));
    return config && typeof config === "object" ? config : null;
  } catch {
    return null; // kaputter oder abgeschnittener Link — die App startet dann normal
  }
}

export function readHash(hash = location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("c");
}

export async function buildShareUrl(config) {
  const url = new URL(location.href);
  url.hash = "c=" + (await encodeConfig(config));
  return url.toString();
}
