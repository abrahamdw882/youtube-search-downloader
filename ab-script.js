const proxyUrl = "https://ab-proxy1.abrahamdw882.workers.dev/?u=";

async function fetchVideos() {
  const query = document.getElementById("searchQuery").value;
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  if (!query) {
    resultsContainer.innerHTML = "<p>Please enter a search query or YouTube URL.</p>";
    return;
  }

  try {
    let apiUrl;

    
    const youtubeUrlPattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = query.match(youtubeUrlPattern);
    if (match && match[1]) {
      const videoId = match[1];
      apiUrl = `https://ironman.koyeb.app/search/yts?query=${encodeURIComponent(videoId)}`;
    } else {
      apiUrl = `https://weeb-api.vercel.app/ytsearch?query=${encodeURIComponent(query)}`;
    }

    const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));

    if (response.status === 404) {
      resultsContainer.innerHTML = "<p>API endpoint not found. Please check the URL.</p>";
      return;
    }

    const data = await response.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      resultsContainer.innerHTML = "<p>No results found.</p>";
      return;
    }

    data.forEach((video) => {
      const videoCard = document.createElement("li");
      videoCard.classList.add("video-card");

      videoCard.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}">
        <div class="video-info">
          <h3><a href="${video.url}" target="_blank">${video.title}</a></h3>
          <p>Author: <a href="${video.author.url}" target="_blank">${video.author.name}</a></p>
          <p>Views: ${video.views.toLocaleString()}</p>
          <p>Duration: ${video.duration.timestamp}</p>
          <button class="download-button" onclick="fetchDownloadLinks(this, '${video.url}')">Download</button>
          <div class="download-section" id="download-${video.url}" style="display: none;"></div>
        </div>
      `;

      resultsContainer.appendChild(videoCard);
    });
  } catch (error) {
    resultsContainer.innerHTML = `<p>Failed to fetch results. Please try again later.</p>`;
    console.error(error);
  }
}

async function fetchDownloadLinks(button, videoUrl) {
  const originalText = button.innerText;
  button.innerText = "Loading...";
  button.disabled = true;

  const downloadSection = document.getElementById(`download-${videoUrl}`);
  downloadSection.innerHTML = "";
  downloadSection.style.display = "block";

  try {
    const response = await fetch(
      proxyUrl +
        encodeURIComponent(`https://api.giftedtech.my.id/api/download/ytdl?apikey=gifted&url=${videoUrl}`)
    );
    const data = await response.json();

    if (data.success && data.result) {
      const result = data.result;

      const videoDownloadButton = document.createElement("a");
      videoDownloadButton.classList.add("download-button");
      videoDownloadButton.href = result.video_url;
      videoDownloadButton.target = "_blank"; 
      videoDownloadButton.innerText = `Download Video (${result.video_quality})`;
      downloadSection.appendChild(videoDownloadButton);

      const audioDownloadButton = document.createElement("a");
      audioDownloadButton.classList.add("download-button");
      audioDownloadButton.href = result.audio_url;
      audioDownloadButton.target = "_blank"; 
      audioDownloadButton.innerText = `Download Audio (${result.audio_quality})`;
      downloadSection.appendChild(audioDownloadButton);
    } else {
      downloadSection.innerHTML = "<p>No download links available.</p>";
    }
  } catch (error) {
    downloadSection.innerHTML = `<p>Failed to fetch download links. Please try again later.</p>`;
    console.error(error);
  }

  button.innerText = originalText;
  button.disabled = false;
}
