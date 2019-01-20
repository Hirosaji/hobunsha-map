"use strict";

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'UA-92245361-5');

function gaSend(action, category, label){
    var data = {
        event_category: category,
        event_label: label
    };

    if (location.host === "hirosaji.github.io") gtag('event', action, data);
    else console.log(data);
}