document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded');

    fetch('data/data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data:', data);
            const container = document.querySelector('.image-list');
            container.innerHTML = '';

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'image-item';

                const img = document.createElement('img');
                img.src = item.imageSrc;
                img.alt = 'Dynamic Image';
                div.appendChild(img);

                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'image-details';

                const text = document.createElement('p');
                text.textContent = item.text;
                detailsDiv.appendChild(text);

                if (item.linkHref) {
                    const link = document.createElement('a');
                    link.href = item.linkHref;
                    link.textContent = 'Learn More';
                    detailsDiv.appendChild(link);
                }

                if (item['has-preview']) {
                    const previewLink = document.createElement('a');
                    previewLink.href = `preview?id=${item.id}`;
                    if (item.linkHref) {
                        previewLink.textContent = 'Preview';
                    } else {
                        previewLink.textContent = 'Read Here';
                    }
                    previewLink.className = 'preview-link';
                    detailsDiv.appendChild(previewLink);
                }

                div.appendChild(detailsDiv);
                container.appendChild(div);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});