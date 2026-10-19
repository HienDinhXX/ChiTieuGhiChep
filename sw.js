const CACHE_VERSION = "quan-ly-chi-tieu-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./photo.html",
  "./manifest.json",
  "./IMG_0670.jpeg"
];

// Cài đặt: lưu các tài nguyên chính của ứng dụng.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Kích hoạt: xóa cache phiên bản cũ.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Xử lý các yêu cầu tải tài nguyên.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Không xử lý các yêu cầu không phải GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Không can thiệp các website bên ngoài.
  if (url.origin !== self.location.origin) return;

  // Khi mở trang: ưu tiên mạng, mất mạng thì dùng cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_VERSION).then((cache) => {
              // Lưu theo đúng URL được yêu cầu (vd: photo.html trong iframe).
              cache.put(request, copy.clone());

              // Trang chính (không phải iframe) thì cập nhật luôn index.html.
              if (request.destination !== "iframe") {
                cache.put("./index.html", copy);
              }
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html") ||
            await caches.match("./")
          );
        })
    );

    return;
  }

  // Tài nguyên tĩnh: dùng cache trước, chưa có thì tải từ mạng.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, copy);
          });
        }

        return response;
      });
    })
  );
});

