const $ = selector => document.querySelector(selector);

async function fetchVideos() {
  const queryInput = $("#searchQuery");
  const resultsContainer = $("#results");
  const loadingDiv = $("#loading");
  let query = queryInput.value.trim();

  if (!query) return alert("Enter a search term or YouTube URL");


  query = query
    .replace(/https?:\/\/youtu\.be\/([\w-]+)/, "https://www.youtube.com/watch?v=$1")
    .replace(/https?:\/\/(www\.)?youtube\.com\/shorts\/([\w-]+)/, "https://www.youtube.com/watch?v=$2");

  resultsContainer.innerHTML = "";
  loadingDiv.classList.remove("hidden");

  try {
    const res = await fetch(`https://ab-yts.abrahamdw882.workers.dev?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    
    const videos = await res.json();
    if (!videos.length) {
      resultsContainer.innerHTML = `<p class="error">No results. Try a different search.</p>`;
      return;
    }

    resultsContainer.innerHTML = videos.map(video => `
      <div class="video-card">
        <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail" />
        <div class="video-content">
          <h3><a href="${video.url}" target="_blank">${video.title}</a></h3>
          <div class="video-meta">
            <p><i class="fas fa-user"></i> 
              ${video.author ? `<a href="${video.author.url}" target="_blank">${video.author.name}</a>` : "Unknown"}
            </p>
            <p><i class="fas fa-eye"></i> ${video.views?.toLocaleString() || "N/A"} views</p>
            <p><i class="fas fa-clock"></i> ${video.duration?.timestamp || "00:00"}</p>
          </div>
          <button class="download-button" onclick="fetchDownloadLinks(this, '${video.url}')">
            <i class="fas fa-download"></i> Download
          </button>
          <div class="download-section" id="download-${video.url}"></div>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  } finally {
    loadingDiv.classList.add("hidden");
  }
}

async function fetchDownloadLinks(button, videoUrl) {
  const section = $(`#download-${videoUrl}`);
  button.disabled = true;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;

  try {
    const res = await fetch(`https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`);
    const data = await res.json();

    const audioLinks = data.audio?.map(a => `
      <a href="https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(a.download)}&download=true" class="download-button" target="_blank">
        <i class="fas fa-music"></i> MP3 (${a.quality})
      </a>`).join("") || "";

    const videoLinks = data.video?.map(v => `
      <a href="https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(v.download)}&download=true" class="download-button" target="_blank">
        <i class="fas fa-video"></i> MP4 (${v.quality})
      </a>`).join("") || "";

    section.innerHTML = audioLinks + videoLinks || `<p class="error">No downloads found</p>`;
  } catch {
    section.innerHTML = `<p class="error">Failed to fetch download links</p>`;
  } finally {
    button.disabled = false;
    button.innerHTML = `<i class="fas fa-download"></i> Download`;
  }
}
