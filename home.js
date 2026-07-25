"use strict";

function parseGermanDate(value) {
  const match = String(value || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match
    ? new Date(`${match[3]}-${match[2]}-${match[1]}`)
    : new Date(value);
}

async function loadHomeNews() {
  const container = document.getElementById("home-news");

  try {
    const response = await fetch("news.json");
    if (!response.ok) {
      throw new Error("news.json nicht gefunden");
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : payload.news || [];

    container.innerHTML = "";

    data
      .slice()
      .sort((a, b) => parseGermanDate(b.date) - parseGermanDate(a.date))
      .slice(0, 3)
      .forEach((newsItem, index) => {
        const article = document.createElement("article");
        article.className = index === 0 ? "news-story featured" : "news-story";

        article.innerHTML = `
          <div class="news-image">
            <img
              src="${newsItem.image}"
              alt="News: ${newsItem.title || "Eselhans"}"
              loading="${index === 0 ? "eager" : "lazy"}"
            >
          </div>
          <div class="news-copy">
            <span class="news-label">NEWS</span>
            <h3>${newsItem.title}</h3>
            <p class="news-date">${newsItem.date}</p>
            <p>${newsItem.text}</p>
            <a class="text-link" href="news.html">News ansehen</a>
          </div>
        `;

        const image = article.querySelector("img");
        image.addEventListener(
          "error",
          () => {
            image.src = "bilder/cover-platzhalter.png";
          },
          { once: true }
        );

        container.appendChild(article);
      });
  } catch (error) {
    container.innerHTML =
      '<p class="loading-state">Aktuelle News konnten nicht geladen werden.</p>';
    console.error("News loading failed:", error);
  } finally {
    container.setAttribute("aria-busy", "false");
  }
}

function getYouTubeId(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) {
        return parts[1] || "";
      }
    }
  } catch (error) {
    return "";
  }

  return "";
}

function toYouTubeEmbedUrl(url) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

async function loadHomeFeaturedVideo() {
  try {
    const response = await fetch("featured.json");
    if (!response.ok) {
      throw new Error("featured.json nicht gefunden");
    }

    const featured = await response.json();
    const embedUrl = toYouTubeEmbedUrl(featured.youtubeUrl);
    const title = document.getElementById("featured-title");
    const description = document.getElementById("featured-description");
    const video = document.getElementById("featured-video");
    const button = document.getElementById("featured-button");

    if (featured.title) {
      title.textContent = featured.title;
      video.title = featured.title;
    }

    if (featured.description) {
      description.textContent = featured.description;
    }

    if (embedUrl) {
      video.src = embedUrl;
    }

    if (featured.youtubeUrl) {
      button.href = featured.youtubeUrl;
    }

    if (featured.buttonText) {
      button.textContent = featured.buttonText;
    }
  } catch (error) {
    console.error("Featured video loading failed:", error);
  }
}

loadHomeNews();
loadHomeFeaturedVideo();
