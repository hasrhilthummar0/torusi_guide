document.addEventListener('DOMContentLoaded', function () {
      const favoriteBtn = document.getElementById('favorite-btn');

      favoriteBtn.addEventListener('click', function (event) {
        event.preventDefault();

        const guideId = this.dataset.guideId;
        const icon = this.querySelector('i');

        fetch(`/api/guides/${guideId}/toggle_favorite`, {
          method: 'POST',
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              this.classList.toggle('favorited');

              if (data.isfavorite) {
                icon.classList.remove('far');
                icon.classList.add('fas');
              } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
              }
            } else {
              alert('Something went wrong. Please try again.');
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('An error occurred.');
          });
      });
    });