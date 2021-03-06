const index = [];

let timer = null,
    precision = 10,
    lastTime = 0,
    startTime = 0,
    offsetTime = 0,
    duration = 0,
    drift = 0,
    playing = false,
    pauseEventId = null;

function processTime () {
    const newTime = (performance.now() - startTime) + offsetTime;

    let newDrift = 0,
        elapsed = newTime - lastTime;

    newDrift = (elapsed - precision) + drift;
    lastTime = newTime;

    for (let i=0; i<index.length; i++) {
        const currentItem = index[i];

        // Check if the event should end
        if (lastTime > currentItem.time + currentItem.duration) {
            if (currentItem.playing) {
                currentItem.playing = false;
                postMessage({
                    id: currentItem.id,
                    type: "end"
                });
            }
        }

        // Check if the event should begin
        else if (lastTime > currentItem.time && currentItem.time + currentItem.duration > lastTime) {
            if (!currentItem.playing) {
                currentItem.playing = true;
                postMessage({
                    id: currentItem.id,
                    type: "begin"
                });
            }
        }
    }

    let endOfPlayback = false;
    if (lastTime > duration) {
        endOfPlayback = true;
        playing = false;
        lastTime = duration;
    }

    postMessage({
        type: "time",
        time: lastTime
    });

    if (playing) {
        timer = setTimeout(processTime, precision - newDrift);
        drift = newDrift;
    }
    else {
        timer = null;
        offsetTime = lastTime;
        drift = 0;
        for (let i=0; i<index.length; i++) {
            index[i].playing = false;
        }

        const eventId = pauseEventId;
        pauseEventId = null;
        postMessage({
            type: endOfPlayback ? "stop" : "pause",
            eventId: eventId
        });
    }
}

function getDuration () {
    return Math.max.apply(Math, index.map((val) => {return val.time + val.duration}));
}

addEventListener("message", (message) => {
    switch (message.data.type) {
        case "play":
            playing = true;
            startTime = performance.now();
            timer = setTimeout(processTime, precision);
            postMessage({
                type: "play",
                eventId: message.data.eventId
            });
            break;
        case "pause":
            playing = false;
            pauseEventId = message.data.eventId;
            break;
        case "seek":
            offsetTime = lastTime = parseFloat(message.data.time);
            postMessage({
                type: "seek",
                time: offsetTime,
                eventId: message.data.eventId
            });
            break;
        case "add":
            let newEvent = message.data;
            newEvent.playing = false;
            index.push(newEvent);
            duration = getDuration();
            break;
        case "remove":
            let result = index.filter((obj) => obj.id === message.data.id);
            if (result) {
                this.index.splice(this.index.indexOf(result), 1);
                duration = getDuration();
            }
            break;
    }
});