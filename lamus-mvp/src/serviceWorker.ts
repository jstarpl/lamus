/// <reference lib="WebWorker" />

// export empty type because of tsc --isolatedModules flag
export type { };
declare const self: ServiceWorkerGlobalScope;

// import { manifest, version } from "@parcel/service-worker";
const version = "dummy";

async function install() {
  const manifestReq = await fetch(`${self.origin}/.vite/manifest.json`, {
    cache: 'no-cache',
  })
  if (!manifestReq.ok) {
    console.error('Could not get asset manifest')
    return
  }
  let manifest = {}
  try {
    manifest = await manifestReq.json() as Record<string, any>
  } catch {
    console.error('Could not parse manifset')
    return
  }

  const cache = await caches.open(version);
  // make manifest entries absolute
  await cache.addAll(unique(Object.entries(manifest).map(([_key, entry]) => `${self.origin}/${entry.file}`)));
}
self.addEventListener("install", (e: ExtendableEvent) =>
  e.waitUntil(install())
);

async function activate() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => key !== version && caches.delete(key)));
}
self.addEventListener("activate", (e: ExtendableEvent) =>
  e.waitUntil(activate())
);

const REWRITES: Record<string, string> = {
  "/": "/index.html",
  "/code": "/index.html",
  "/text": "/index.html",
  "/files": "/index.html",
};

self.addEventListener("fetch", (event: FetchEvent) => {
  const request = event.request;

  // The request is for our origin and is not targeted towards the API
  if (
    request.url.startsWith(self.origin) &&
    !request.url.startsWith(`${self.origin}/api/`) &&
    !request.url.startsWith(`${self.origin}/internal/`)
  ) {
    // The request is text/html, so respond by caching the
    // item or showing the /offline offline
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // do not keep responses that aren't 200, because Cache can't support them
          if (response.status !== 200) return response;

          // Stash a copy of this page in the cache
          const copy = response.clone();
          caches.open(version).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(async () => {
          let response = await caches.match(request);
          if (response) return response;

          const url = new URL(request.url);
          const rewriteTarget = REWRITES[url.pathname];
          if (!rewriteTarget) return cacheError();

          response = await caches.match(rewriteTarget);
          return response || cacheError();
        }) as Promise<Response>
    );
    return;
  }

  if (request.url.startsWith("https://fonts.googleapis.com")) {
    // The request is for fonts and CSS
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // do not keep responses that aren't 200, because Cache can't support them
          if (response.status !== 200) return response;

          // Stash a copy of this page in the cache
          const copy = response.clone();
          caches.open(version).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(async () => {
          let response = await caches.match(request);
          if (response) return response;

          return cacheError();
        }) as Promise<Response>
    );
    return;
  }
});

function cacheError(): Response {
  return new Response(null, {
    status: 503,
  });
}

// function ensureEndsWithSlash(url: string): string {
//   if (!url.endsWith("/")) return `${url}/`;
//   return url;
// }

function unique<T>(list: T[]): T[] {
  function onlyUnique(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
  }

  var unique = list.filter(onlyUnique);

  return unique;
}
