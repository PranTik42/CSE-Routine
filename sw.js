const CACHE = "cse-routine-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];


self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      caches
        .open(CACHE)
        .then(
          cache =>
            cache.addAll(APP_FILES)
        )
    );

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys =>
            Promise.all(
              keys
                .filter(
                  key =>
                    key !== CACHE
                )
                .map(
                  key =>
                    caches.delete(key)
                )
            )
        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    if (
      request.method !== "GET"
    )
      return;


    const url =
      new URL(request.url);


    /*
      Routine data:
      ALWAYS try network first.
    */

    if (
      url.pathname.endsWith(
        "/data.json"
      )
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )
        .then(
          response => {

            const copy =
              response.clone();

            caches
              .open(CACHE)
              .then(
                cache =>
                  cache.put(
                    request,
                    copy
                  )
              );

            return response;

          }
        )
        .catch(
          () =>
            caches.match(
              request
            )
        )

      );

      return;
    }


    /*
      HTML / CSS / JS:
      NETWORK FIRST.
    */

    if (
      request.destination === "document" ||
      request.destination === "script" ||
      request.destination === "style"
    ) {

      event.respondWith(

        fetch(request)
          .then(
            response => {

              const copy =
                response.clone();

              caches
                .open(CACHE)
                .then(
                  cache =>
                    cache.put(
                      request,
                      copy
                    )
                );

              return response;

            }
          )
          .catch(
            () =>
              caches.match(request)
          )

      );

      return;
    }


    /*
      Other assets:
      cache first.
    */

    event.respondWith(

      caches
        .match(request)
        .then(
          cached =>
            cached ||
            fetch(request)
        )

    );

  }
);
