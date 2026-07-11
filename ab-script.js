let rotation = 0;
let animationFrame;
let hasJoinedChannel = localStorage.getItem('hasJoinedChannel') === 'true';
let pendingDownload = null;

function normaliseInput(raw) {
    return (raw || "").trim();
}

function extractVideoId(raw) {
    const input = normaliseInput(raw);
    if (!input) return null;

    const bareIdPattern = /^[A-Za-z0-9_-]{8,15}$/;
    if (!input.includes("http") && bareIdPattern.test(input)) {
        return input;
    }

    let url;
    try {
        url = new URL(input);
    } catch {
        try {
            url = new URL("https://" + input);
        } catch {
            return null;
        }
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const pathname = url.pathname;
    const parts = pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
        return parts[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        if (pathname.startsWith("/watch")) {
            return url.searchParams.get("v");
        }
        if (parts[0] === "shorts" && parts[1]) {
            return parts[1];
        }
        if (parts[0] === "embed" && parts[1]) {
            return parts[1];
        }
    }

    const fallbackId = url.searchParams.get("v");
    if (fallbackId) return fallbackId;

    return null;
}

function buildWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

function initModal() {
    const whatsappModal = document.getElementById('whatsappModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModal = document.getElementById('closeModal');
    
    if (!hasJoinedChannel) {
        setTimeout(() => {
            if (whatsappModal) whatsappModal.classList.add('active');
        }, 3000);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (whatsappModal) whatsappModal.classList.remove('active');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (whatsappModal) whatsappModal.classList.remove('active');
        });
    }
    
    if (whatsappModal) {
        whatsappModal.addEventListener('click', (e) => {
            if (e.target === whatsappModal) {
                whatsappModal.classList.remove('active');
            }
        });
    }
    
    const joinButton = document.querySelector('.modal-button.join');
    if (joinButton) {
        joinButton.addEventListener('click', function(e) {
            e.preventDefault();
            joinChannel();
            window.open(this.href, '_blank');
        });
    }
}

function joinChannel() {
    localStorage.setItem('hasJoinedChannel', 'true');
    hasJoinedChannel = true;
    const whatsappModal = document.getElementById('whatsappModal');
    if (whatsappModal) whatsappModal.classList.remove('active');
    if (pendingDownload) {
        const { button, videoUrl, server } = pendingDownload;
        fetchDownloadLinks(button, videoUrl, server);
        pendingDownload = null;
    }
}

function handleDownloadClick(button, videoUrl, server) {
    if (!hasJoinedChannel) {
        pendingDownload = { button, videoUrl, server };
        const whatsappModal = document.getElementById('whatsappModal');
        if (whatsappModal) whatsappModal.classList.add('active');
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-exclamation-circle"></i> Join Required`;
        setTimeout(() => {
            if (!hasJoinedChannel && button) {
                button.disabled = false;
                button.innerHTML = `<i class="fas fa-download"></i> Server ${server}`;
            }
        }, 3000);
    } else {
        fetchDownloadLinks(button, videoUrl, server);
    }
}

function toggleLoader(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        if (show) {
            loader.classList.remove('hidden');
            startSpinner();
        } else {
            loader.classList.add('hidden');
            stopSpinner();
        }
    }
}

function startSpinner() {
    const spinner = document.querySelector('.spinner');
    if (spinner) {
        function animate() {
            rotation += 6;
            spinner.style.transform = `rotate(${rotation}deg)`;
            animationFrame = requestAnimationFrame(animate);
        }
        animate();
    }
}

function stopSpinner() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    rotation = 0;
}

async function fetchVideos() {
    const searchQuery = document.getElementById("searchQuery");
    const resultsContainer = document.getElementById("results");

    if (!searchQuery || !resultsContainer) return;

    let query = searchQuery.value.trim();
    if (!query) return;

    // Try to extract video ID first
    const videoId = extractVideoId(query);
    
    if (videoId) {
        query = buildWatchUrl(videoId);
    } else {
        // Fallback regex replacements
        query = query
            .replace(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$1")
            .replace(/https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$2");
    }

    try {
        resultsContainer.innerHTML = '';
        toggleLoader(true);

        const apiUrl = `https://ab-yts.abrahamdw882.workers.dev?query=${encodeURIComponent(query)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

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
                    <div class="server-buttons">
                        <button class="download-button server-1" onclick="handleDownloadClick(this, '${video.url}', 1)">
                            <i class="fas fa-download"></i>
                            Server 1
                        </button>
                        <button class="download-button server-2" onclick="handleDownloadClick(this, '${video.url}', 2)">
                            <i class="fas fa-download"></i>
                            Server 2
                        </button>
                    </div>
                    <div class="download-section" id="download-${video.url}"></div>
                </div>
            </div>
        `).join('');

    } catch(error) {
        resultsContainer.innerHTML = `<p class="error">Error loading videos. Please try again.</p>`;
        console.error('Fetch error:', error);
    } finally {
        toggleLoader(false);
    }
}

async function fetchDownloadLinks(button, videoUrl, server) {
    const originalContent = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
    button.disabled = true;

    const downloadSection = document.getElementById(`download-${videoUrl}`);
    downloadSection.innerHTML = '';

    try {
        let apiUrl;

        if (server === 1) {
            apiUrl = `https://api-abztech.zone.id/download/ytdl4?url=${encodeURIComponent(videoUrl)}`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();

            if (data.status && data.downloadUrl) {
                downloadSection.innerHTML = `
                    <a href="${data.downloadUrl}" class="download-button" target="_blank" download>
                        <i class="fas fa-video"></i> MP4 ${data.finalQuality || 'HD'}
                    </a>
                `;
            } else {
                downloadSection.innerHTML = `<p class="error">No available formats</p>`;
            }
        } else if (server === 2) {
            apiUrl = `https://youtubeabdlpro.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data && data.status && data.results) {
                const { video = {}, audio = {} } = data.results;

                for (const bitrate in audio) {
                    const a = audio[bitrate];
                    if (a && a.url) {
                        downloadSection.innerHTML += `
                            <a href="${a.url}" class="download-button" download>
                                <i class="fas fa-music"></i> Audio ${bitrate}
                            </a>`;
                    }
                }

                for (const quality in video) {
                    const v = video[quality];
                    if (v && v.url) {
                        downloadSection.innerHTML += `
                            <a href="${v.url}" class="download-button" download>
                                <i class="fas fa-video"></i> Video ${quality}
                            </a>`;
                    }
                }
            } else {
                downloadSection.innerHTML = `<p class="error">No available formats</p>`;
            }
        }

        if (downloadSection.children.length === 0) {
            downloadSection.innerHTML = `<p class="error">No download options available</p>`;
        }

    } catch (error) {
        downloadSection.innerHTML = `<p class="error">Error loading download options</p>`;
        console.error('Download error:', error);
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', initModal);
