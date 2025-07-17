const profileId = "<%= guide.id %>"; // wrap in quotes ✅

fetch(`/profile/views/${profileId}`, {
    method: "POST"
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        document.getElementById('views-count').innerText = data.views + " Views";
    }
})
.catch(err => console.error(err));
