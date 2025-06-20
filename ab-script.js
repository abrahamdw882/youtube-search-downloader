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
        const apiUrl = `https://ab-ytdlprov2.abrahamdw882.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

     
        if (data.audio && data.audio.length > 0) {
            data.audio.forEach(audio => {
                const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(audio.download)}`;
                downloadSection.innerHTML += `
                    <a href="${proxied}" class="download-button" download>
                        <i class="fas fa-music"></i>
                        MP3 Audio (${audio.quality}kbps)
                    </a>
                `;
            });
        }

        
        if (data.video && data.video.length > 0) {
            data.video.forEach(video => {
                const proxied = `https://ab-ytdlv3.abrahamdw882.workers.dev/?file=${encodeURIComponent(video.download)}`;
                downloadSection.innerHTML += `
                    <a href="${proxied}" class="download-button" download>
                        <i class="fas fa-video"></i>
                        MP4 Video (${video.quality}p)
                    </a>
                `;
            });
        }

    } catch (error) {
        downloadSection.innerHTML = `<p class="error">Error loading download options</p>`;
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

 document.querySelector('.modal-button.join').addEventListener('click', function(e) {
            e.preventDefault();
            joinChannel();
            window.open(this.href, '_blank');
        });
