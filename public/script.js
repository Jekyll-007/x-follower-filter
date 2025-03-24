document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(document.currentScript.getAttribute('data') || 
                            window.location.href.split('data=')[1] || 
                            fetch('/data').then(res => res.json()));
    
    if (data) {
        document.getElementById('nonMutualFollowing').innerHTML = data.nonMutualFollowing.map(user => `<li>@${user}</li>`).join('');
        document.getElementById('mutualFollows').innerHTML = data.mutualFollows.map(user => `<li>@${user}</li>`).join('');
        document.getElementById('nonMutualFollowers').innerHTML = data.nonMutualFollowers.map(user => `<li>@${user}</li>`).join('');
    }
});