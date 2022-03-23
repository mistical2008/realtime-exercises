const chat = document.getElementById("chat");
const msgs = document.getElementById("msgs");

// let's store all current messages here
let allChat = [];

// the interval to poll at in milliseconds
const INTERVAL = 3000;

// a submit listener on the form in the HTML
chat.addEventListener("submit", function (e) {
    e.preventDefault();
    postNewMsg(chat.elements.user.value, chat.elements.text.value);
    chat.elements.text.value = "";
});

async function postNewMsg(user, text) {
    const data = {
        user,
        text,
    };

    const options = {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        await fetch("/poll", options);
    } catch (error) {
        console.error("polling error", error);
    }
}

async function getNewMsgs() {
    let json;
    try {
        const res = await fetch("/poll");
        json = await res.json();
    } catch (error) {
        console.error("polling error", error);
    }

    allChat = json.msg;
    render();
}

function render() {
    // as long as allChat is holding all current messages, this will render them
    // into the ui. yes, it's inefficent. yes, it's fine for this example
    const html = allChat.map(({ user, text, time, id }) => {
        return template(user, text, time, id);
    });
    msgs.innerHTML = html.join("\n");
}

// given a user and a msg, it returns an HTML string to render to the UI
const template = (user, msg) => {
    return `<li class="collection-item"><span class="badge">${user}</span>${msg}</li>`;
};

/**
 * @param {any} cb - callback to run on every interval
 * @param {any} INTERVAL - time in ms
 */
function runPoll(cb, INTERVAL, startTime = 0) {
    let timeToMakeNextRequest = startTime;

    /**
     * @param {any} time - time in ms passed by requestAnimationFrame (started from 0)
     */
    function rafTimer(time) {
        if (timeToMakeNextRequest <= time) {
            cb();
            timeToMakeNextRequest = time + INTERVAL;
        }
        requestAnimationFrame(rafTimer);
    }

    requestAnimationFrame(rafTimer);
}

runPoll(getNewMsgs, INTERVAL);
