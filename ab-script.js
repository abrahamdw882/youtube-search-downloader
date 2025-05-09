async function fetchVideos() {
    let query = document.getElementById("searchQuery").value.trim();
    const resultsContainer = document.getElementById("results");
    const loadingDiv = document.getElementById("loading");

    if (!query) {
        alert("Please enter a search term or YouTube URL");
        return;
    }

    query = query
        .replace(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$1")
        .replace(/https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$2");

    try {
        resultsContainer.innerHTML = '';
        loadingDiv.classList.remove("hidden");

        const apiUrl = `https://ab-yts.abrahamdw882.workers.dev?query=${encodeURIComponent(query)}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();

        if (!data.length) {
            resultsContainer.innerHTML = `<p class="error">No videos found. Try a different search</p>`;
            return;
        }

        resultsContainer.innerHTML = data.map(video => `
            <div class="video-card">
                <img src="${video.thumbnail}" class="thumbnail" alt="${video.title}">
                <div class="video-content">
                    <h3 class="video-title">
                        <a href="${video.url}" target="_blank">${video.title}</a>
                    </h3>
                    <div class="video-meta">
                        <p><i class="fas fa-user"></i> 
                            ${video.author ? 
                                `<a href="${video.author.url}" target="_blank">${video.author.name}</a>` : 
                                'Unknown author'}
                        </p>
                        <p><i class="fas fa-eye"></i> ${(video.views?.toLocaleString() || 'N/A')} views</p>
                        <p><i class="fas fa-clock"></i> ${video.duration?.timestamp || '00:00'}</p>
                    </div>
                    <button class="download-button" onclick="fetchDownloadLinks(this, '${video.url}')">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                    <div class="download-section" id="download-${video.url}"></div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Fetch error:", error);
        resultsContainer.innerHTML = `
            <p class="error">
                Error loading videos: ${error.message}<br>
                Please check your connection and try again
            </p>
        `;
    } finally {
        loadingDiv.classList.add("hidden");
    }
}

async function fetchDownloadLinks(button, videoUrl) {
    const originalContent = button.innerHTML;
    button.innerHTML = `
        <span class="button-content">
            <i class="fas fa-spinner fa-spin"></i>
            Loading...
        </span>
    `;
    button.disabled = true;

    const downloadSection = document.getElementById(`download-${videoUrl}`);
    downloadSection.innerHTML = '';

    try {
        const apiUrl = `https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        downloadSection.innerHTML = `
            ${data.audio?.map(audio => `
                <a href="https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(audio.download)}&download=true" class="download-button" target="_blank">
                    <i class="fas fa-music"></i>
                    Download MP3 (${audio.quality})
                </a>
            `).join('') || '<p>No audio formats available</p>'}

            ${data.video?.map(video => `
                <a href="https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(video.download)}&download=true" class="download-button" target="_blank">
                    <i class="fas fa-video"></i>
                    Download MP4 (${video.quality})
                </a>
            `).join('') || '<p>No video formats available</p>'}
        `;
    } catch (error) {
        downloadSection.innerHTML = `<p class="error">Error loading download options</p>`;
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}
