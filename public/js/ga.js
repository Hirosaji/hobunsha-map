(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-92245361-5', 'auto');
ga('send', 'pageview');

function gaSend(category, label){
    var data = {
        hitType: 'event',
        eventCategory: category,
        eventAction: 'hobunsha-map',
        eventLabel: label,
        transport: 'beacon'
    };

    if (location.host === "hirosaji.github.io") ga('send', data);
    else console.log(data);
}