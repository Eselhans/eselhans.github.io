(() => {
  "use strict";

  const DATA_URL = "news.json";
  const CURRENT_STORY_COUNT = 3;

  function parseNewsDate(value) {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || "").trim());

    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return {
      date,
      iso: `${match[3]}-${match[2]}-${match[1]}`,
      timestamp: date.getTime(),
    };
  }

  function sortNews(items) {
    return items
      .map((item, originalIndex) => ({
        item,
        originalIndex,
        parsedDate: parseNewsDate(item.date),
      }))
      .sort((left, right) => {
        if (left.parsedDate && right.parsedDate) {
          return (
            right.parsedDate.timestamp - left.parsedDate.timestamp ||
            left.originalIndex - right.originalIndex
          );
        }

        if (left.parsedDate) {
          return -1;
        }

        if (right.parsedDate) {
          return 1;
        }

        return left.originalIndex - right.originalIndex;
      });
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function getCategory(item) {
    return typeof item.category === "string" && item.category.trim()
      ? item.category.trim()
      : "";
  }

  function getLink(item) {
    const candidates = [
      item.link,
      item.url,
      item.href,
      item.youtube,
      item.video,
      item.extra,
      item.extra2,
    ];

    return candidates.find((value) => {
      const candidate = String(value || "").trim();
      return /^(https?:\/\/|\/|\.{0,2}\/|[\w-]+\.html(?:[?#].*)?$)/i.test(
        candidate
      );
    });
  }

  function getLinkLabel(href) {
    const target = String(href).toLowerCase();

    if (target.includes("youtube.com") || target.includes("youtu.be")) {
      return "Video ansehen";
    }

    if (target.includes("songs.html")) {
      return "Song im Archiv öffnen";
    }

    if (
      target.includes("musik.html") ||
      target.includes("spotify.") ||
      target.includes("music.apple.") ||
      target.includes("music.amazon.") ||
      target.includes("music.youtube.")
    ) {
      return "Musik hören";
    }

    return "Mehr erfahren";
  }

  function appendLink(container, item) {
    const href = getLink(item);

    if (!href) {
      return;
    }

    const link = createElement("a", "story-action", getLinkLabel(href));
    link.href = String(href).trim();

    const targetUrl = new URL(link.href, window.location.href);
    if (targetUrl.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener";
    }

    container.append(link);
  }

  function createImage(item, loading = "lazy") {
    if (!item.image || !String(item.image).trim()) {
      return null;
    }

    const figure = createElement("figure", "story-image");
    const image = document.createElement("img");
    image.src = String(item.image).trim();
    image.alt = `Bild zur Meldung „${String(item.title || "Eselhans").trim()}“`;
    image.loading = loading;
    image.decoding = "async";

    if (loading === "eager") {
      image.fetchPriority = "high";
    }

    figure.append(image);
    return figure;
  }

  function appendMeta(container, record) {
    const meta = createElement("div", "story-meta");
    const time = document.createElement("time");
    time.textContent = record.item.date || "Ohne Datum";

    if (record.parsedDate) {
      time.dateTime = record.parsedDate.iso;
    }

    meta.append(time);

    const category = getCategory(record.item);
    if (category) {
      meta.append(createElement("span", "story-category", category));
    }

    container.append(meta);
  }

  function appendStoryText(container, item) {
    container.append(createElement("p", "story-text", item.text || ""));
    appendLink(container, item);
  }

  function createLeadStory(record) {
    const article = createElement("article", "lead-story");
    const image = createImage(record.item, "eager");

    if (image) {
      article.append(image);
    }

    const copy = createElement("div", "lead-copy");
    appendMeta(copy, record);
    copy.append(createElement("h2", "", record.item.title || "Ohne Titel"));
    appendStoryText(copy, record.item);
    article.append(copy);

    return article;
  }

  function createCurrentStory(record) {
    const article = createElement("article", "current-story");
    const image = createImage(record.item);

    if (image) {
      article.append(image);
    }

    const copy = createElement("div", "current-copy");
    appendMeta(copy, record);
    copy.append(createElement("h3", "", record.item.title || "Ohne Titel"));
    appendStoryText(copy, record.item);
    article.append(copy);

    return article;
  }

  function createArchiveStory(record) {
    const article = createElement("article", "archive-story");
    const image = createImage(record.item);

    if (image) {
      article.append(image);
    }

    const copy = createElement("div", "archive-copy");
    appendMeta(copy, record);
    copy.append(createElement("h4", "", record.item.title || "Ohne Titel"));
    appendStoryText(copy, record.item);
    article.append(copy);

    return article;
  }

  function monthLabel(record) {
    if (!record.parsedDate) {
      return "Ohne Datum";
    }

    return new Intl.DateTimeFormat("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(record.parsedDate.date);
  }

  function createCurrentSection(records) {
    if (!records.length) {
      return null;
    }

    const section = createElement("section", "current-section");
    section.setAttribute("aria-labelledby", "current-news-heading");

    const heading = createElement("div", "section-heading");
    const headingCopy = createElement("div");
    headingCopy.append(createElement("span", "article-kicker", "Gerade passiert"));

    const title = createElement("h2", "", "Weitere aktuelle Meldungen");
    title.id = "current-news-heading";
    headingCopy.append(title);
    heading.append(headingCopy);
    heading.append(
      createElement(
        "p",
        "",
        "Neue Musik, Videos und kleine Notizen aus dem Entstehungsprozess."
      )
    );
    section.append(heading);

    const grid = createElement("div", "current-grid");
    records.forEach((record) => grid.append(createCurrentStory(record)));
    section.append(grid);

    return section;
  }

  function createArchiveSection(records) {
    if (!records.length) {
      return null;
    }

    const section = createElement("section", "archive-section");
    section.setAttribute("aria-labelledby", "archive-heading");

    const heading = createElement("div", "archive-heading");
    heading.append(createElement("span", "article-kicker", "Chronologisch"));

    const title = createElement("h2", "", "Im Musikjournal");
    title.id = "archive-heading";
    heading.append(title);
    heading.append(
      createElement(
        "p",
        "",
        "Ältere Meldungen, nach Monaten geordnet und vollständig erhalten."
      )
    );
    section.append(heading);

    const groups = new Map();
    records.forEach((record) => {
      const label = monthLabel(record);

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label).push(record);
    });

    groups.forEach((groupRecords, label) => {
      const group = createElement("section", "month-group");
      const monthHeading = createElement("h3", "", label);
      const groupId = `month-${groupRecords[0].originalIndex}`;
      monthHeading.id = groupId;
      group.setAttribute("aria-labelledby", groupId);
      group.append(monthHeading);

      const items = createElement("div", "month-items");
      groupRecords.forEach((record) => items.append(createArchiveStory(record)));
      group.append(items);
      section.append(group);
    });

    return section;
  }

  function renderNews(items) {
    const content = document.getElementById("news-content");
    const count = document.getElementById("news-count");
    const records = sortNews(items);

    count.textContent = `${items.length} ${items.length === 1 ? "Meldung" : "Meldungen"}`;
    content.replaceChildren();

    if (!records.length) {
      content.append(createElement("p", "error-note", "Noch keine Meldungen vorhanden."));
      content.setAttribute("aria-busy", "false");
      return;
    }

    content.append(createLeadStory(records[0]));

    const currentRecords = records.slice(1, CURRENT_STORY_COUNT + 1);
    const currentSection = createCurrentSection(currentRecords);
    if (currentSection) {
      content.append(currentSection);
    }

    const archiveSection = createArchiveSection(
      records.slice(CURRENT_STORY_COUNT + 1)
    );
    if (archiveSection) {
      content.append(archiveSection);
    }

    content.setAttribute("aria-busy", "false");
  }

  async function loadNews() {
    const content = document.getElementById("news-content");

    try {
      const response = await fetch(DATA_URL);

      if (!response.ok) {
        throw new Error(`news.json konnte nicht geladen werden (${response.status})`);
      }

      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.news;

      if (!Array.isArray(items)) {
        throw new Error("news.json enthält keine gültige News-Liste");
      }

      renderNews(items);
    } catch (error) {
      console.error("News loading failed:", error);
      content.replaceChildren(
        createElement(
          "p",
          "error-note",
          "Die Meldungen konnten gerade nicht geladen werden."
        )
      );
      content.setAttribute("aria-busy", "false");
    }
  }

  loadNews();
})();
