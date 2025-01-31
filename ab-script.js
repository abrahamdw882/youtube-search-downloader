const proxyUrl = "https://ab-proxy1.abrahamdw882.workers.dev/?u=";

async function fetchWithRetry(url, options = {}, retries = 2, backoff = 200) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); 

            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, backoff * (i + 1)));
            } else {
                throw error;
            }
        }
    }
}

async function fetchVideos() {
    const query = document.getElementById("searchQuery").value;
    const resultsContainer = document.getElementById("results");
    const loadingDiv = document.getElementById("loading");
    resultsContainer.innerHTML = "";

    if (!query) {
        resultsContainer.innerHTML = "<p>Please enter a search query or YouTube URL.</p>";
        return;
    }

    loadingDiv.classList.remove("hidden");

    try {
        const apiUrl = `https://weeb-api.vercel.app/ytsearch?query=${encodeURIComponent(query)}`;
        const response = await fetchWithRetry(proxyUrl + encodeURIComponent(apiUrl));

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
    } finally {
        loadingDiv.classList.add("hidden");
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
        const mp3ApiUrl = `https://nikka-api.us.kg/dl/ytdl?url=${videoUrl}&format=mp3&apiKey=nikka`;
        const mp4ApiUrl = `https://api.davidcyriltech.my.id/download/ytmp4?url=${videoUrl}`;

        const [mp3Response, mp4Response] = await Promise.all([
            fetchWithRetry(proxyUrl + encodeURIComponent(mp3ApiUrl)),
            fetchWithRetry(proxyUrl + encodeURIComponent(mp4ApiUrl))
        ]);

        const mp3Data = await mp3Response.json();
        const mp4Data = await mp4Response.json();

        if (mp3Data.success && mp3Data.data.downloadUrl) {
            const audioDownloadButton = document.createElement("a");
            audioDownloadButton.classList.add("download-button");
            audioDownloadButton.href = mp3Data.data.downloadUrl;
            audioDownloadButton.target = "_blank";
            audioDownloadButton.innerText = `Download Audio (MP3)`;
            downloadSection.appendChild(audioDownloadButton);
        }

        if (mp4Data.success && mp4Data.result) {
            const videoDownloadButton = document.createElement("a");
            videoDownloadButton.classList.add("download-button");
            videoDownloadButton.href = mp4Data.result.download_url;
            videoDownloadButton.target = "_blank";
            videoDownloadButton.innerText = `Download Video (${mp4Data.result.quality})`;
            downloadSection.appendChild(videoDownloadButton);
        }

        if (!mp3Data.success && !mp4Data.success) {
            downloadSection.innerHTML = "<p>No download links available.</p>";
        }
    } catch (error) {
        downloadSection.innerHTML = `<p>Failed to fetch download links. Please try again later.</p>`;
        console.error(error);
    }

    button.innerText = originalText;
    button.disabled = false;
}
