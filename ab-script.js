 let rotation = 0;
        let animationFrame;

        function toggleLoader(show) {
            const loader = document.getElementById('loading');
            if(show) {
                loader.classList.remove('hidden');
                startSpinner();
            } else {
                loader.classList.add('hidden');
                stopSpinner();
            }
        }

        function startSpinner() {
            const spinner = document.querySelector('.spinner');
            function animate() {
                rotation += 6;
                spinner.style.transform = `rotate(${rotation}deg)`;
                animationFrame = requestAnimationFrame(animate);
            }
            animate();
        }

        function stopSpinner() {
            cancelAnimationFrame(animationFrame);
            rotation = 0;
        }

        async function fetchVideos() {
            let query = document.getElementById("searchQuery").value.trim();
            const resultsContainer = document.getElementById("results");

            if(!query) return;

            query = query
                .replace(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$1")
                .replace(/https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(\?.*)?/, "https://www.youtube.com/watch?v=$2");

            try {
                resultsContainer.innerHTML = '';
                toggleLoader(true);

                const apiUrl = `https://ab-yts.abrahamdw882.workers.dev?query=${encodeURIComponent(query)}`;
                const response = await fetch(apiUrl);
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
                            <button class="download-button" onclick="fetchDownloadLinks(this, '${video.url}')">
                                <i class="fas fa-download"></i>
                                Download
                            </button>
                            <div class="download-section" id="download-${video.url}"></div>
                        </div>
                    </div>
                `).join('');

            } catch(error) {
                resultsContainer.innerHTML = `<p class="error">Error loading videos</p>`;
            } finally {
                toggleLoader(false);
            }
        }

      async function fetchDownloadLinks(button, videoUrl) {
    const originalContent = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
    button.disabled = true;

    const downloadSection = document.getElementById(`download-${videoUrl}`);
    downloadSection.innerHTML = '';

    try {
        const audioApiUrl = `https://ab-ytdlprov2.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
        const audioResponse = await fetch(audioApiUrl);
        const audioData = await audioResponse.json();

        const videoApiUrl = `https://ab-ytdlv3.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
        const videoResponse = await fetch(videoApiUrl);
        const videoData = await videoResponse.json();

        if (audioData.audio && audioData.audio.length > 0) {
            downloadSection.insertAdjacentHTML('beforeend', `<h4>Audio Only</h4>`);
            audioData.audio.forEach(audio => {
                const directUrl = audio.download;
                const ext = audio.format ? audio.format.toUpperCase() : 'MP3';
                const quality = audio.quality || '128';
                
                downloadSection.insertAdjacentHTML('beforeend', `
                    <a href="${directUrl}" class="download-button" download>
                        <i class="fas fa-music"></i>
                        ${ext} (${quality}kbps)
                    </a>
                `);
            });
        }

        if (videoData.code === 0 && videoData.data && Array.isArray(videoData.data.items)) {
            const items = videoData.data.items;
            const videoWithAudioItems = items.filter(item => item.type === "video_with_audio");
            if (videoWithAudioItems.length > 0) {
                downloadSection.insertAdjacentHTML('beforeend', `<h4>360px Vid</h4>`);
                videoWithAudioItems.forEach(video => {
                    const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(video.url)}`;
                    const ext = video.ext ? video.ext.toUpperCase() : 'MP4';
                    const label = video.label || (video.height ? `${video.height}p` : 'Unknown Quality');
                    
                    downloadSection.insertAdjacentHTML('beforeend', `
                        <a href="${proxied}" class="download-button" download>
                            <i class="fas fa-video"></i>
                            ${ext} (${label})
                        </a>
                    `);
                });
            }

            const videoOnlyItems = items.filter(item => item.type === "video" && item.height > 0);
            if (videoOnlyItems.length > 0) {
                downloadSection.insertAdjacentHTML('beforeend', `<h4>Video Only</h4>`);
                videoOnlyItems.forEach(video => {
                    const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(video.url)}`;
                    const ext = video.ext ? video.ext.toUpperCase() : 'MP4';
                    const label = video.label || (video.height ? `${video.height}p` : 'Unknown Quality');
                    
                    downloadSection.insertAdjacentHTML('beforeend', `
                        <a href="${proxied}" class="download-button" download>
                            <i class="fas fa-film"></i>
                            ${ext} (${label})
                        </a>
                    `);
                });
            }
        }

        if (downloadSection.children.length === 0) {
            downloadSection.innerHTML = `<p class="error">No download options available</p>`;
        }

    } catch (error) {
        console.error("Download error:", error);
        downloadSection.innerHTML = `<p class="error">Error loading download options: ${error.message}</p>`;
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}
