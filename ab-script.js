let rotation = 0;
let animationFrame;
let hasJoinedChannel = localStorage.getItem('hasJoinedChannel') === 'true';
let pendingDownload = null;

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

    query = query
        .replace(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$1")
        .replace(/https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$2");

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
        console.error("Error fetching videos:", error);
        const resultsContainer = document.getElementById("results");
        if (resultsContainer) {
            resultsContainer.innerHTML = `<p class="error">Error loading videos. Please try again.</p>`;
        }
    } finally {
        toggleLoader(false);
    }
}

async function fetchDownloadLinks(button, videoUrl, server) {
    if (!button) return;

    const originalContent = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
    button.disabled = true;

    const downloadSection = document.getElementById(`download-${videoUrl}`);
    if (!downloadSection) {
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
    }

    downloadSection.innerHTML = '';

    try {
        let apiUrl;

        if (server === 1) {
            apiUrl = `https://ab-ytdlprov2.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            if (data.audio && data.audio.length > 0) {
                data.audio.forEach(audio => {
                    const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(audio.download)}`;
                    downloadSection.innerHTML += `
                        <a href="${proxied}" class="download-button" download>
                            <i class="fas fa-music"></i> MP3 Audio (${audio.quality}kbps)
                        </a>`;
                });
            }

            if (data.video && data.video.length > 0) {
                data.video.forEach(video => {
                    const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(video.download)}`;
                    downloadSection.innerHTML += `
                        <a href="${proxied}" class="download-button" download>
                            <i class="fas fa-video"></i> MP4 Video (${video.quality}p)
                        </a>`;
                });
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
        console.error("Error fetching download links:", error);
        if (downloadSection) {
            downloadSection.innerHTML = `<p class="error">Error loading download options</p>`;
        }
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}
document.addEventListener('DOMContentLoaded', initModal);
