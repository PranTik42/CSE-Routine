let data = null;

let selectedSection =
  localStorage.getItem("routine-section") || "";

let currentView = "today";

let deferredInstallPrompt = null;


const $ = (id) =>
  document.getElementById(id);


const dayOrder = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY"
];


function todayName() {

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      timeZone: "Asia/Dhaka"
    }
  )
    .format(new Date())
    .toUpperCase();
}


function currentDhakaMinutes() {

  const value =
    new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Dhaka"
      }
    )
      .format(new Date());

  const [h, m] =
    value.split(":").map(Number);

  return h * 60 + m;
}


function timeToMinutes(time) {

  const [h, m] =
    time.split(":").map(Number);

  return h * 60 + m;
}


function formatTime(time) {

  const [h, m] =
    time.split(":").map(Number);

  const suffix =
    h >= 12 ? "PM" : "AM";

  const hour =
    h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}


function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>'"]/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;"
        })[c]
    );
}


function classesFor(
  day,
  section = selectedSection
) {

  return data.events

    .filter(
      e =>
        e.day === day &&
        e.section === section
    )

    .sort(
      (a, b) =>
        a.start.localeCompare(b.start)
    );
}


/* =========================
   SECTION SEARCH
========================= */

function setupSections() {

  const sections =
    [...data.sections].sort(
      (a, b) =>
        a.localeCompare(
          b,
          undefined,
          { numeric: true }
        )
    );


  if (
    !sections.includes(selectedSection)
  ) {

    selectedSection =
      sections[0] || "";

    localStorage.setItem(
      "routine-section",
      selectedSection
    );
  }


  $("sectionCount").textContent =
    `${sections.length} sections`;


  renderSuggestedSections(sections);


  renderSectionResults(
    sections
  );


  const search =
    $("sectionSearch");


  search.addEventListener(
    "input",
    () => {

      const query =
        search.value
          .trim()
          .toUpperCase();


      $("clearSearch")
        .classList.toggle(
          "hidden",
          !query
        );


      const filtered =
        sections.filter(
          section =>
            section
              .toUpperCase()
              .includes(query)
        );


      renderSectionResults(
        filtered
      );
    }
  );


  $("clearSearch")
    .addEventListener(
      "click",
      () => {

        search.value = "";

        $("clearSearch")
          .classList.add(
            "hidden"
          );

        renderSectionResults(
          sections
        );

        search.focus();
      }
    );
}


function renderSuggestedSections(
  sections
) {

  const preferred = [
    "71_C",
    "71_D",
    "71_B",
    "71_A",
    "71_E",
    "71_F"
  ];


  const suggestions = [];


  if (
    selectedSection &&
    sections.includes(selectedSection)
  ) {

    suggestions.push(
      selectedSection
    );
  }


  for (
    const section of preferred
  ) {

    if (
      sections.includes(section) &&
      !suggestions.includes(section)
    ) {

      suggestions.push(section);
    }

    if (suggestions.length >= 6)
      break;
  }


  for (
    const section of sections
  ) {

    if (suggestions.length >= 6)
      break;

    if (!suggestions.includes(section))
      suggestions.push(section);
  }


  $("suggestedSections").innerHTML =
    suggestions
      .map(
        section =>

          `<button
            class="section-chip ${
              section === selectedSection
                ? "active"
                : ""
            }"
            data-section="${escapeHtml(section)}"
          >
            ${escapeHtml(section)}
          </button>`
      )
      .join("");


  document
    .querySelectorAll(".section-chip")
    .forEach(
      button =>

        button.addEventListener(
          "click",
          () => {

            selectSection(
              button.dataset.section
            );

          }
        )
    );
}


function renderSectionResults(
  sections
) {

  const container =
    $("sectionResults");


  if (!sections.length) {

    container.innerHTML =
      `<div class="no-results">
        No section found.
        Try something like <strong>71_C</strong>.
      </div>`;

    return;
  }


  container.innerHTML =
    sections
      .map(
        section =>

          `<button
            class="result-button ${
              section === selectedSection
                ? "active"
                : ""
            }"
            data-section="${escapeHtml(section)}"
          >
            ${escapeHtml(section)}
          </button>`
      )
      .join("");


  container
    .querySelectorAll(".result-button")
    .forEach(
      button =>

        button.addEventListener(
          "click",
          () => {

            selectSection(
              button.dataset.section
            );

          }
        )
    );
}


function selectSection(section) {

  selectedSection = section;


  localStorage.setItem(
    "routine-section",
    selectedSection
  );


  $("selectedSectionLabel")
    .textContent =
      selectedSection;


  const search =
    $("sectionSearch");


  search.value = "";


  $("clearSearch")
    .classList.add("hidden");


  renderSuggestedSections(
    [...data.sections].sort()
  );


  renderSectionResults(
    [...data.sections].sort()
  );


  render();
}


/* =========================
   TODAY
========================= */

function renderToday() {

  const day =
    todayName();


  const classes =
    classesFor(day);


  const date =
    new Intl.DateTimeFormat(
      "en-US",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dhaka"
      }
    )
      .format(new Date());


  const prettyDay =
    day.charAt(0) +
    day.slice(1).toLowerCase();


  $("todayTitle")
    .textContent =
      `${prettyDay} · ${date}`;


  $("selectedSectionLabel")
    .textContent =
      selectedSection;


  if (!classes.length) {

    $("todayView").innerHTML =

      `<div class="empty">
        <div class="empty-icon">✦</div>
        No classes for
        <strong>
          ${escapeHtml(selectedSection)}
        </strong>
        today.
        <br>
        Enjoy your free time.
      </div>`;

  } else {

    $("todayView").innerHTML =

      `<div class="schedule">
        ${classes
          .map(classCard)
          .join("")}
      </div>`;
  }


  renderNextClass(
    classes
  );
}


/* =========================
   NEXT CLASS
========================= */

function renderNextClass(classes) {

  const now =
    currentDhakaMinutes();


  const current =
    classes.find(
      e =>
        timeToMinutes(e.start) <= now &&
        now < timeToMinutes(e.end)
    );


  const next =
    classes.find(
      e =>
        timeToMinutes(e.start) > now
    );


  if (current) {

    const remaining =
      timeToMinutes(current.end) - now;


    $("nextClass").innerHTML =

      `<div class="next-label">
        CURRENTLY IN CLASS
      </div>

      <div class="next-course">
        ${escapeHtml(current.course)}
      </div>

      <div class="next-info">
        ${formatTime(current.start)}
        –
        ${formatTime(current.end)}
        ·
        ${escapeHtml(current.room)}
      </div>

      <div class="next-countdown">
        Ends in ${remaining} minutes
      </div>`;

    return;
  }


  if (!next) {

    $("nextClass").innerHTML =

      `<div class="next-label">
        TODAY
      </div>

      <div class="next-course">
        You're done ✦
      </div>

      <div class="next-info">
        No more classes for
        ${escapeHtml(selectedSection)}
        today.
      </div>`;

    return;
  }


  const minutes =
    timeToMinutes(next.start) - now;


  $("nextClass").innerHTML =

    `<div class="next-label">
      NEXT CLASS
    </div>

    <div class="next-course">
      ${escapeHtml(next.course)}
    </div>

    <div class="next-info">
      ${formatTime(next.start)}
      ·
      ${escapeHtml(next.room)}
      ·
      ${escapeHtml(next.teacher || "—")}
    </div>

    <div class="next-countdown">
      Starts in ${formatCountdown(minutes)}
    </div>`;
}


function formatCountdown(minutes) {

  if (minutes < 60)
    return `${minutes} min`;


  const hours =
    Math.floor(minutes / 60);

  const mins =
    minutes % 60;


  if (!mins)
    return `${hours}h`;


  return `${hours}h ${mins}m`;
}


/* =========================
   CLASS CARD
========================= */

function classCard(e) {

  const now =
    currentDhakaMinutes();


  const active =
    timeToMinutes(e.start) <= now &&
    now < timeToMinutes(e.end);


  return `

    <article
      class="class-card ${
        active ? "current" : ""
      }"
    >

      <div class="time">

        ${formatTime(e.start)}

        <br>

        <span class="muted">
          to ${formatTime(e.end)}
        </span>

      </div>


      <div>

        <div class="course">
          ${escapeHtml(e.course)}
        </div>

        <div class="details">

          Teacher:
          ${escapeHtml(e.teacher || "—")}

          <br>

          Section:
          ${escapeHtml(e.section)}

        </div>

      </div>


      <div class="room">

        ${escapeHtml(e.room)}

      </div>

    </article>

  `;
}


/* =========================
   WEEK
========================= */

function renderWeek() {

  const today =
    todayName();


  $("weekView").innerHTML =

    `<div class="week-grid">

      ${dayOrder
        .map(day => {

          const classes =
            classesFor(day);


          return `

            <article
              class="week-day ${
                day === today
                  ? "today"
                  : ""
              }"
            >

              <h3>
                ${
                  day.charAt(0) +
                  day.slice(1)
                    .toLowerCase()
                }
              </h3>

              ${
                classes.length

                  ? classes
                      .map(
                        e => `

                          <div class="mini">

                            <div class="mini-time">
                              ${formatTime(e.start)}
                              –
                              ${formatTime(e.end)}
                            </div>

                            <div class="mini-course">
                              ${escapeHtml(e.course)}
                            </div>

                            <div class="mini-room">
                              ${escapeHtml(e.room)}
                            </div>

                          </div>

                        `
                      )
                      .join("")

                  : `<div class="muted">
                       No classes
                     </div>`
              }

            </article>

          `;

        })
        .join("")}

    </div>`;
}


/* =========================
   RENDER
========================= */

function render() {

  renderToday();

  renderWeek();
}


/* =========================
   VIEW TABS
========================= */

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        currentView =
          button.dataset.view;


        document
          .querySelectorAll(".tab")
          .forEach(
            b =>
              b.classList.toggle(
                "active",
                b === button
              )
          );


        $("todayView")
          .classList.toggle(
            "hidden",
            currentView !== "today"
          );


        $("weekView")
          .classList.toggle(
            "hidden",
            currentView !== "week"
          );

      }
    );

  });


/* =========================
   TODAY BUTTON
========================= */

$("todayBtn")
  .addEventListener(
    "click",
    () => {

      document
        .querySelector(
          '[data-view="today"]'
        )
        .click();


      window.scrollTo({
        top:
          document
            .querySelector(".view-header")
            .offsetTop - 20,

        behavior: "smooth"
      });

    }
  );


/* =========================
   PWA INSTALL
========================= */

window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredInstallPrompt =
      event;

    $("installBtn")
      .classList.remove(
        "hidden"
      );

  }
);


$("installBtn")
  .addEventListener(
    "click",
    async () => {

      if (!deferredInstallPrompt)
        return;


      deferredInstallPrompt.prompt();

      await deferredInstallPrompt.userChoice;

      deferredInstallPrompt = null;

      $("installBtn")
        .classList.add(
          "hidden"
        );

    }
  );


/* =========================
   LOAD DATA
========================= */

async function load() {

  try {

    const response =
      await fetch(
        `./data.json?v=${Date.now()}`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok)
      throw new Error(
        "Routine data could not be loaded."
      );


    data =
      await response.json();


    setupSections();


    $("meta") &&
      (
        $("meta").textContent =
          data.metadata?.version
            ? `Version ${data.metadata.version}`
            : ""
      );


    $("footerMeta")
      .textContent =
        data.metadata?.effective_from
          ? `Updated: ${data.metadata.effective_from}`
          : "Routine";


    render();

  }

  catch(error) {

    console.error(error);

    $("todayView").innerHTML =

      `<div class="empty">
        Unable to load routine data.
        <br>
        <small>
          ${escapeHtml(error.message)}
        </small>
      </div>`;

  }

}


/* =========================
   SERVICE WORKER
========================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker.register(
    "./sw.js"
  );

}


load();
