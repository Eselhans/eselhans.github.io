(() => {
  "use strict";

  const state = {
    songs: [],
    type: "all",
    sort: "newest",
    query: "",
    activeLyricsButton: null,
    singleNodes: new Map(),
    albumGroups: [],
  };

  const elements = {
    page: document.getElementById("songs-page"),
    archive: document.getElementById("archive-content"),
    catalogCount: document.getElementById("catalog-count"),
    search: document.getElementById("song-search"),
    searchReset: document.getElementById("search-reset"),
    emptyReset: document.getElementById("empty-reset"),
    sort: document.getElementById("song-sort"),
    filters: [...document.querySelectorAll(".filter-button")],
    resultStatus: document.getElementById("result-status"),
    emptyState: document.getElementById("empty-state"),
    latestSection: document.getElementById("latest-section"),
    latestReleases: document.getElementById("latest-releases"),
    singlesSection: document.getElementById("singles-section"),
    singlesCount: document.getElementById("singles-count"),
    singlesGrid: document.getElementById("singles-grid"),
    albumsSection: document.getElementById("albums-section"),
    albumsCount: document.getElementById("albums-count"),
    albumList: document.getElementById("album-list"),
    modal: document.getElementById("lyrics-modal"),
    dialog: document.querySelector(".lyrics-dialog"),
    modalClose: document.getElementById("lyrics-close"),
    modalTitle: document.getElementById("lyrics-modal-title"),
    modalMeta: document.getElementById("lyrics-modal-meta"),
    modalText: document.getElementById("lyrics-modal-text"),
    modalCover: document.getElementById("lyrics-cover"),
    modalYoutube: document.getElementById("lyrics-youtube"),
  };

  init();

  async function init() {
    bindControls();

    try {
      const response = await fetch("songs.json");
      if (!response.ok) {
        throw new Error(`songs.json konnte nicht geladen werden (${response.status})`);
      }

      const payload = await response.json();
      state.songs = Array.isArray(payload) ? payload : payload.songs || [];

      renderArchive();
      renderLatestReleases();
      applyView();

      elements.catalogCount.textContent =
        `${state.songs.length} veröffentlichte Songs`;
      elements.archive.setAttribute("aria-busy", "false");
    } catch (error) {
      console.error("Songs konnten nicht geladen werden:", error);
      elements.resultStatus.textContent = "Songs konnten nicht geladen werden.";
      elements.latestReleases.textContent =
        "Neue Veröffentlichungen konnten nicht geladen werden.";
      elements.archive.setAttribute("aria-busy", "false");
    }
  }

  function bindControls() {
    elements.search.addEventListener("input", () => {
      state.query = elements.search.value.trim();
      applyView();
    });

    elements.sort.addEventListener("change", () => {
      state.sort = elements.sort.value;
      applyView();
    });

    elements.filters.forEach((button) => {
      button.addEventListener("click", () => {
        state.type = button.dataset.filter || "all";
        elements.filters.forEach((filterButton) => {
          filterButton.setAttribute(
            "aria-pressed",
            String(filterButton === button),
          );
        });
        applyView();
      });
    });

    elements.searchReset.addEventListener("click", resetView);
    elements.emptyReset.addEventListener("click", resetView);

    document.addEventListener("click", (event) => {
      const lyricsButton = event.target.closest(".lyrics-trigger");
      if (lyricsButton) {
        openLyrics(Number(lyricsButton.dataset.songIndex), lyricsButton);
      }
    });

    elements.modalClose.addEventListener("click", closeLyrics);
    elements.modal.addEventListener("click", (event) => {
      if (event.target === elements.modal) {
        closeLyrics();
      }
    });

    document.addEventListener("keydown", handleDialogKeyboard);
  }

  function renderArchive() {
    elements.singlesGrid.replaceChildren();
    elements.albumList.replaceChildren();
    state.singleNodes.clear();
    state.albumGroups = [];

    const singles = [];
    const albumMap = new Map();

    state.songs.forEach((song, index) => {
      if (isSingle(song)) {
        singles.push(index);
        return;
      }

      const albumName = normalizedAlbum(song);
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, []);
      }
      albumMap.get(albumName).push(index);
    });

    singles.forEach((index) => {
      const card = createSingleCard(index);
      state.singleNodes.set(index, card);
      elements.singlesGrid.append(card);
    });

    const albumEntries = [...albumMap.entries()].sort((a, b) => {
      return latestTimestamp(b[1]) - latestTimestamp(a[1]);
    });
    const defaultOpenAlbums = window.matchMedia("(max-width: 700px)").matches
      ? 1
      : 2;

    albumEntries.forEach(([albumName, indexes], albumPosition) => {
      const group = createAlbumGroup(
        albumName,
        indexes,
        albumPosition < defaultOpenAlbums,
        albumPosition,
      );
      state.albumGroups.push(group);
      elements.albumList.append(group.element);
    });

    elements.singlesCount.textContent = pluralizeSongs(singles.length);
    elements.albumsCount.textContent =
      `${albumEntries.length} Alben · ${pluralizeSongs(
        state.songs.length - singles.length,
      )}`;
  }

  function createSingleCard(index) {
    const song = state.songs[index];
    const card = createElement("article", "single-card archive-song");
    card.dataset.songIndex = String(index);
    card.dataset.kind = "single";

    const cover = createElement("div", "single-cover");
    cover.append(createCover(song));

    const copy = createElement("div", "single-copy");
    const title = createElement("h4");
    title.textContent = song.title || "Unbenannter Song";
    const meta = createElement("p", "song-meta");
    meta.textContent = songMeta(song);

    copy.append(title, meta, createActions(song, index));
    card.append(cover, copy);
    return card;
  }

  function createAlbumGroup(
    albumName,
    indexes,
    defaultOpen,
    albumPosition,
  ) {
    const group = createElement("article", "album-group");
    group.dataset.album = albumName;

    const overview = createElement("div", "album-overview");
    const coverWrap = createElement("div", "album-cover");
    coverWrap.append(createCover(state.songs[indexes[0]], albumName));

    const info = createElement("div", "album-info");
    const kicker = createElement("span", "section-kicker");
    kicker.textContent = "Album";
    const heading = createElement("h4");
    heading.textContent = albumName;
    const count = createElement("p", "album-match-count");
    count.textContent = pluralizeSongs(indexes.length);
    const releaseRange = createElement("p");
    releaseRange.textContent = albumReleaseRange(indexes);

    const panelId = `album-tracks-${albumPosition + 1}`;
    const toggle = createElement("button", "album-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", panelId);
    toggle.setAttribute("aria-expanded", String(defaultOpen));
    setAlbumToggleText(toggle, defaultOpen, albumName);

    info.append(kicker, heading, count, releaseRange, toggle);
    overview.append(coverWrap, info);

    const panel = createElement("div", "album-panel");
    panel.id = panelId;
    panel.hidden = !defaultOpen;

    const trackList = createElement("ol", "track-list");
    const trackNodes = new Map();
    indexes.forEach((index) => {
      const track = createAlbumTrack(index);
      trackNodes.set(index, track);
      trackList.append(track);
    });
    panel.append(trackList);
    group.append(overview, panel);

    const groupState = {
      element: group,
      indexes,
      trackNodes,
      panel,
      toggle,
      count,
      defaultOpen,
      userExpanded: defaultOpen,
    };

    toggle.addEventListener("click", () => {
      groupState.userExpanded =
        toggle.getAttribute("aria-expanded") !== "true";
      setAlbumExpanded(groupState, groupState.userExpanded);
    });

    return groupState;
  }

  function createAlbumTrack(index) {
    const song = state.songs[index];
    const item = createElement("li", "album-track archive-song");
    item.dataset.songIndex = String(index);
    item.dataset.kind = "album";

    const copy = createElement("div");
    const title = createElement("p", "track-title");
    title.textContent = song.title || "Unbenannter Song";
    const meta = createElement("p", "track-meta");
    meta.textContent = trackMeta(song);
    copy.append(title, meta);

    item.append(copy, createActions(song, index));
    return item;
  }

  function renderLatestReleases() {
    const latestIndexes = state.songs
      .map((song, index) => ({ index, timestamp: releaseTimestamp(song) }))
      .sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return a.index - b.index;
      })
      .slice(0, 4)
      .map((entry) => entry.index);

    elements.latestReleases.replaceChildren();
    if (latestIndexes.length === 0) {
      elements.latestReleases.textContent =
        "Keine Veröffentlichungen vorhanden.";
      return;
    }

    const feature = createLatestFeature(latestIndexes[0]);
    const secondary = createElement("div", "latest-secondary");
    latestIndexes.slice(1).forEach((index) => {
      secondary.append(createLatestItem(index));
    });

    elements.latestReleases.append(feature, secondary);
  }

  function createLatestFeature(index) {
    const song = state.songs[index];
    const article = createElement("article", "latest-feature");

    const image = createElement("div", "latest-feature-image");
    image.append(createCover(song));

    const copy = createElement("div", "latest-copy");
    const kicker = createElement("span", "section-kicker");
    kicker.textContent = "Neuester Titel";
    const title = createElement("h3");
    title.textContent = song.title || "Unbenannter Song";
    const meta = createElement("p", "latest-meta");
    meta.textContent = songMeta(song);

    copy.append(kicker, title, meta, createActions(song, index));
    article.append(image, copy);
    return article;
  }

  function createLatestItem(index) {
    const song = state.songs[index];
    const article = createElement("article", "latest-item");

    const image = createElement("div", "latest-thumb");
    image.append(createCover(song));

    const copy = createElement("div");
    const title = createElement("h3");
    title.textContent = song.title || "Unbenannter Song";
    const meta = createElement("p", "latest-meta");
    meta.textContent = songMeta(song);
    copy.append(title, meta, createActions(song, index));

    article.append(image, copy);
    return article;
  }

  function createActions(song, index) {
    const row = createElement("div", "action-row");

    if (song.youtube) {
      const youtube = createElement("a", "action-link");
      youtube.href = song.youtube;
      youtube.target = "_blank";
      youtube.rel = "noopener";
      youtube.textContent = "YouTube";
      youtube.setAttribute(
        "aria-label",
        `${song.title || "Song"} auf YouTube ansehen`,
      );
      row.append(youtube);
    } else {
      const unavailable = createElement("span", "action-unavailable");
      unavailable.textContent = "Kein Video-Link";
      row.append(unavailable);
    }

    const lyrics = createElement("button", "lyrics-trigger");
    lyrics.type = "button";
    lyrics.dataset.songIndex = String(index);
    lyrics.setAttribute("aria-haspopup", "dialog");
    lyrics.setAttribute("aria-controls", "lyrics-modal");
    lyrics.textContent = "Lyrics";
    lyrics.setAttribute(
      "aria-label",
      `Lyrics zu ${song.title || "diesem Song"} anzeigen`,
    );
    row.append(lyrics);

    return row;
  }

  function createCover(song, albumName = "") {
    const image = document.createElement("img");
    image.src = song.cover || "bilder/cover-platzhalter.png";
    image.alt = albumName
      ? `Albumcover: ${albumName}`
      : `Cover: ${song.title || "Eselhans Song"} von Eselhans`;
    image.loading = "lazy";
    image.decoding = "async";
    return image;
  }

  function applyView() {
    if (state.songs.length === 0) {
      return;
    }

    const normalizedQuery = state.query.toLocaleLowerCase("de");
    const matchingIndexes = state.songs
      .map((song, index) => ({ song, index }))
      .filter(({ song }) => matchesType(song) && matchesQuery(song, normalizedQuery))
      .map(({ index }) => index);
    const visible = new Set(matchingIndexes);

    const sortedSingles = sortIndexes(
      [...state.singleNodes.keys()].filter((index) => visible.has(index)),
    );
    sortedSingles.forEach((index) => {
      const node = state.singleNodes.get(index);
      node.hidden = false;
      elements.singlesGrid.append(node);
    });
    state.singleNodes.forEach((node, index) => {
      node.hidden = !visible.has(index);
    });

    let visibleAlbums = 0;
    let visibleAlbumSongs = 0;
    const albumGroupsInOrder = [...state.albumGroups].sort(compareAlbumGroups);

    albumGroupsInOrder.forEach((group) => {
      const visibleTracks = group.indexes.filter((index) => visible.has(index));
      const sortedTracks = sortIndexes(visibleTracks);
      const hasMatches = visibleTracks.length > 0;

      group.element.hidden = !hasMatches;
      if (hasMatches) {
        visibleAlbums += 1;
        visibleAlbumSongs += visibleTracks.length;
        elements.albumList.append(group.element);
      }

      group.trackNodes.forEach((track, index) => {
        track.hidden = !visible.has(index);
      });
      sortedTracks.forEach((index) => {
        group.panel.querySelector(".track-list").append(
          group.trackNodes.get(index),
        );
      });

      group.count.textContent =
        visibleTracks.length === group.indexes.length
          ? pluralizeSongs(group.indexes.length)
          : `${pluralizeSongs(visibleTracks.length)} von ${group.indexes.length}`;

      if (state.query && hasMatches) {
        setAlbumExpanded(group, true);
      } else {
        setAlbumExpanded(group, group.userExpanded);
      }
    });

    const visibleSingles = matchingIndexes.filter((index) =>
      isSingle(state.songs[index]),
    ).length;

    elements.singlesSection.hidden = visibleSingles === 0;
    elements.albumsSection.hidden = visibleAlbums === 0;
    elements.singlesCount.textContent = pluralizeSongs(visibleSingles);
    elements.albumsCount.textContent =
      `${visibleAlbums} ${visibleAlbums === 1 ? "Album" : "Alben"} · ` +
      pluralizeSongs(visibleAlbumSongs);

    const count = matchingIndexes.length;
    const hasCustomView =
      state.query !== "" || state.type !== "all" || state.sort !== "newest";

    elements.resultStatus.textContent = resultLabel(count);
    elements.resultStatus.classList.toggle("is-default", !hasCustomView);
    elements.searchReset.hidden = !hasCustomView;
    elements.emptyState.hidden = count !== 0;
    elements.latestSection.hidden = hasCustomView;
  }

  function resetView() {
    state.query = "";
    state.type = "all";
    state.sort = "newest";
    elements.search.value = "";
    elements.sort.value = "newest";
    elements.filters.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === "all"),
      );
    });
    applyView();
    elements.search.focus();
  }

  function resultLabel(count) {
    const base = count === 1 ? "1 Treffer" : `${count} Treffer`;
    const parts = [];

    if (state.query) {
      parts.push(`für „${state.query}“`);
    }
    if (state.type === "singles") {
      parts.push("in Singles");
    }
    if (state.type === "albums") {
      parts.push("in Alben");
    }

    if (count === 0) {
      return parts.length
        ? `Keine Treffer ${parts.join(" ")}.`
        : "Keine Treffer.";
    }
    return parts.length ? `${base} ${parts.join(" ")}.` : base;
  }

  function matchesType(song) {
    if (state.type === "singles") {
      return isSingle(song);
    }
    if (state.type === "albums") {
      return !isSingle(song);
    }
    return true;
  }

  function matchesQuery(song, query) {
    if (!query) {
      return true;
    }
    return [song.title, song.album, song.genre]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("de").includes(query));
  }

  function sortIndexes(indexes) {
    return [...indexes].sort((leftIndex, rightIndex) => {
      const left = state.songs[leftIndex];
      const right = state.songs[rightIndex];

      if (state.sort === "title") {
        return String(left.title || "").localeCompare(
          String(right.title || ""),
          "de",
          { sensitivity: "base" },
        );
      }

      const leftTimestamp = releaseTimestamp(left);
      const rightTimestamp = releaseTimestamp(right);
      const leftHasDate = Number.isFinite(leftTimestamp);
      const rightHasDate = Number.isFinite(rightTimestamp);

      // Undatierte oder abweichend datierte Songs bleiben bei beiden
      // chronologischen Sortierungen stabil am Ende.
      if (!leftHasDate && !rightHasDate) {
        return leftIndex - rightIndex;
      }
      if (!leftHasDate && rightHasDate) {
        return 1;
      }
      if (leftHasDate && !rightHasDate) {
        return -1;
      }

      const difference = leftTimestamp - rightTimestamp;
      if (difference !== 0) {
        return state.sort === "oldest" ? difference : -difference;
      }

      return String(left.title || "").localeCompare(
        String(right.title || ""),
        "de",
        { sensitivity: "base" },
      );
    });
  }

  function compareAlbumGroups(left, right) {
    if (state.sort === "title") {
      return normalizedAlbum(state.songs[left.indexes[0]]).localeCompare(
        normalizedAlbum(state.songs[right.indexes[0]]),
        "de",
        { sensitivity: "base" },
      );
    }

    const leftTimestamp = latestTimestamp(left.indexes);
    const rightTimestamp = latestTimestamp(right.indexes);
    const leftHasDate = Number.isFinite(leftTimestamp);
    const rightHasDate = Number.isFinite(rightTimestamp);

    if (!leftHasDate && !rightHasDate) {
      return 0;
    }
    if (!leftHasDate && rightHasDate) {
      return 1;
    }
    if (leftHasDate && !rightHasDate) {
      return -1;
    }

    const difference = leftTimestamp - rightTimestamp;
    return state.sort === "oldest" ? difference : -difference;
  }

  function setAlbumExpanded(group, expanded) {
    group.toggle.setAttribute("aria-expanded", String(expanded));
    group.panel.hidden = !expanded;
    setAlbumToggleText(
      group.toggle,
      expanded,
      normalizedAlbum(state.songs[group.indexes[0]]),
    );
  }

  function setAlbumToggleText(button, expanded, albumName) {
    button.textContent = expanded
      ? `Trackliste schließen`
      : `Trackliste anzeigen`;
    button.setAttribute(
      "aria-label",
      `${expanded ? "Trackliste schließen" : "Trackliste anzeigen"}: ${albumName}`,
    );
  }

  function openLyrics(index, button) {
    const song = state.songs[index];
    if (!song) {
      return;
    }

    state.activeLyricsButton = button;
    elements.modalTitle.textContent = song.title || "Song";
    elements.modalMeta.textContent = [
      normalizedAlbum(song),
      song.genre || "",
      displayRelease(song.release),
    ]
      .filter(Boolean)
      .join(" · ");
    elements.modalCover.src =
      song.cover || "bilder/cover-platzhalter.png";
    elements.modalCover.alt =
      `Cover: ${song.title || "Eselhans Song"} von Eselhans`;

    elements.modalText.replaceChildren();
    const lyrics = String(song.lyrics || "Songtext folgt");
    lyrics.split(/\n\s*\n/).forEach((stanza) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = stanza;
      elements.modalText.append(paragraph);
    });

    if (song.youtube) {
      elements.modalYoutube.href = song.youtube;
      elements.modalYoutube.hidden = false;
    } else {
      elements.modalYoutube.hidden = true;
      elements.modalYoutube.removeAttribute("href");
    }

    elements.modal.hidden = false;
    elements.dialog.scrollTop = 0;
    elements.page.setAttribute("inert", "");
    document.body.classList.add("modal-open");
    elements.modalClose.focus();
  }

  function closeLyrics() {
    if (elements.modal.hidden) {
      return;
    }

    elements.modal.hidden = true;
    elements.page.removeAttribute("inert");
    document.body.classList.remove("modal-open");

    if (state.activeLyricsButton) {
      state.activeLyricsButton.focus();
      state.activeLyricsButton = null;
    }
  }

  function handleDialogKeyboard(event) {
    if (elements.modal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLyrics();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = [
      ...elements.modal.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((item) => !item.hidden);

    if (focusable.length === 0) {
      event.preventDefault();
      elements.modalClose.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function isSingle(song) {
    return normalizedAlbum(song).toLocaleLowerCase("de") === "singles";
  }

  function normalizedAlbum(song) {
    const value = String(song.album || "").trim();
    return value || "Singles";
  }

  function releaseTimestamp(song) {
    const value = String(song.release || "").trim().replace(/\./g, "-");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return Number.NEGATIVE_INFINITY;
    }

    const [year, month, day] = value.split("-").map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    const isValid =
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;

    return isValid ? timestamp : Number.NEGATIVE_INFINITY;
  }

  function latestTimestamp(indexes) {
    return Math.max(
      ...indexes.map((index) => releaseTimestamp(state.songs[index])),
    );
  }

  function displayRelease(value) {
    const normalized = String(value || "").trim().replace(/\./g, "-");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return value || "";
    }

    const [year, month, day] = normalized.split("-");
    return `${day}.${month}.${year}`;
  }

  function songMeta(song) {
    return [song.genre || "Genre nicht angegeben", displayRelease(song.release)]
      .filter(Boolean)
      .join(" · ");
  }

  function trackMeta(song) {
    return [song.genre || "", displayRelease(song.release)]
      .filter(Boolean)
      .join(" · ") || "Keine weiteren Angaben";
  }

  function albumReleaseRange(indexes) {
    const releases = indexes
      .map((index) => state.songs[index].release)
      .filter(Boolean)
      .map((release) => ({
        raw: release,
        timestamp: releaseTimestamp({ release }),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (releases.length === 0) {
      return "Datum nicht angegeben";
    }

    const first = displayRelease(releases[0].raw);
    const last = displayRelease(releases[releases.length - 1].raw);
    return first === last ? first : `${first} – ${last}`;
  }

  function pluralizeSongs(count) {
    return count === 1 ? "1 Song" : `${count} Songs`;
  }

  function createElement(tagName, className = "") {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }
})();
