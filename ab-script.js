const proxyUrl = "https://ab-ytdl-processing.abrahamdw882.workers.dev/?u=";

function convertYouTubeURL(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === "youtu.be") {
            const videoId = parsedUrl.pathname.substring(1);
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
    } catch (error) {
        console.error("Invalid URL format:", error);
    }
    return url; 
}

async function fetchWithRetry(url, options = {}, retries = 5, backoff = 500) {
    let attempt = 0;
    while (attempt < retries || retries === -1) { 
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); 

            console.log(`Attempt ${attempt + 1} - Fetching: ${url}`);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            console.log(`Success after ${attempt + 1} attempts.`);
            return response;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;

            if (retries !== -1 && attempt >= retries) {
                console.error("Max retries reached. Request failed.");
                throw error;
            }

            const delay = backoff * attempt;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
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
        let searchQuery = query.startsWith("http") ? convertYouTubeURL(query) : query;
        const apiUrl = `https://delirius-apiofc.vercel.app/search/ytsearch?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetchWithRetry(proxyUrl + encodeURIComponent(apiUrl), {}, -1); 

        const data = await response.json();

        if (!data || !data.status || !data.data || data.data.length === 0) {
            resultsContainer.innerHTML = "<p>No results found.</p>";
            return;
        }

        data.data.forEach((video) => {
            const videoCard = document.createElement("li");
            videoCard.classList.add("video-card");

            videoCard.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}">
                <div class="video-info">
                    <h3><a href="${video.url}" target="_blank">${video.title}</a></h3>
                    <p>Author: <a href="${video.author.url}" target="_blank">${video.author.name}</a></p>
                    <p>Views: ${video.views.toLocaleString()}</p>
                    <p>Duration: ${video.duration}</p>
                    <button class="download-button" onclick="fetchDownloadLinks(this, '${video.url}')">Download</button>
                    <div class="download-section" id="download-${video.videoId}" style="display: none;"></div>
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
    button.disabled = true;

    let dots = "";
    const loadingInterval = setInterval(() => {
        dots = dots.length < 4 ? dots + "." : "";
        button.innerText = `📀Loading${dots}`;
    }, 500);

    const downloadSection = document.getElementById(`download-${videoUrl}`);
    downloadSection.innerHTML = "";
    downloadSection.style.display = "block";

    try {
        const mp3ApiUrl = `https://ditzdevs-ytdl-api.hf.space/api/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const mp4ApiUrl = `https://ditzdevs-ytdl-api.hf.space/api/ytmp4?url=${encodeURIComponent(videoUrl)}&reso=360p`;

        const [mp3Response, mp4Response] = await Promise.all([
            fetchWithRetry(mp3ApiUrl, {}, -1),
            fetchWithRetry(mp4ApiUrl, {}, -1)
        ]);

        let mp3Data, mp4Data;

        try {
            mp3Data = await mp3Response.json();
        } catch (e) {
            console.error("MP3 JSON Parsing Error:", e);
            mp3Data = {};
        }

        try {
            mp4Data = await mp4Response.json();
        } catch (e) {
            console.error("MP4 JSON Parsing Error:", e);
            mp4Data = {};
        }

        if (mp3Data.status && mp3Data.download?.downloadUrl) {
            const audioDownloadButton = document.createElement("a");
            audioDownloadButton.classList.add("download-button");
            audioDownloadButton.href = proxyUrl + encodeURIComponent(mp3Data.download.downloadUrl);
            audioDownloadButton.target = "_blank";
            audioDownloadButton.innerText = `Download Audio (MP3)`;
            downloadSection.appendChild(audioDownloadButton);
        }

        if (mp4Data.status && mp4Data.download?.downloadUrl) {
            const videoDownloadButton = document.createElement("a");
            videoDownloadButton.classList.add("download-button");
            videoDownloadButton.href = proxyUrl + encodeURIComponent(mp4Data.download.downloadUrl);
            videoDownloadButton.target = "_blank";
            videoDownloadButton.innerText = `Download Video (MP4 360p)`;
            downloadSection.appendChild(videoDownloadButton);
        }

        if (!mp3Data.status && !mp4Data.status) {
            downloadSection.innerHTML = "<p>No download links available.</p>";
        }
    } catch (error) {
        downloadSection.innerHTML = `<p>Failed to fetch download links. Please try again later.</p>`;
        console.error(error);
    } finally {
        clearInterval(loadingInterval);
        button.innerText = originalText;
        button.disabled = false;
    }
}
