const proxyUrl = "https://broken-star-6439.abrahamdw882.workers.dev/?u=";

async function fetchVideos() {
  const query = document.getElementById('searchQuery').value;
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = ''; 

  if (!query) {
    resultsContainer.innerHTML = '<p>Please enter a search query.</p>';
    return;
  }

  try {
    const response = await fetch(proxyUrl + encodeURIComponent(`https://weeb-api.vercel.app/ytsearch?query=${query}`));
    const data = await response.json();

    if (data.length === 0) {
      resultsContainer.innerHTML = '<p>No results found.</p>';
      return;
    }

    data.forEach(video => {
      const videoCard = document.createElement('li');
      videoCard.classList.add('video-card');

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
  downloadSection.innerHTML = ''; 
  downloadSection.style.display = 'block'; 

  try {
    const response = await fetch(proxyUrl + encodeURIComponent(`https://ironman.koyeb.app/ironman/dl/yt?url=${videoUrl}`));
    const data = await response.json();

    if (data.data && data.data.result) {
      const result = data.data.result;

      
      result.videos.forEach(video => {
        const downloadButton = document.createElement('a');
        downloadButton.classList.add('download-button');
        downloadButton.href = video.url;
        downloadButton.target = '_blank';
        downloadButton.innerText = `${video.quality} - ${video.type}`;
        downloadSection.appendChild(downloadButton);
      });

      
      result.audios.forEach(audio => {
        const downloadButton = document.createElement('a');
        downloadButton.classList.add('download-button');
        downloadButton.href = audio.url;
        downloadButton.target = '_blank';
        downloadButton.innerText = `Audio - ${audio.type}`;
        downloadSection.appendChild(downloadButton);
      });
    } else {
      downloadSection.innerHTML = '<p>No download links available.</p>';
    }
  } catch (error) {
    downloadSection.innerHTML = `<p>Failed to fetch download links. Please try again later.</p>`;
    console.error(error);
  }

  button.innerText = originalText; 
  button.disabled = false;
}
