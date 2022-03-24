const chat = document.getElementById("chat");
const msgs = document.getElementById("msgs");

// let's store all current messages here
let allChat = [];

// the interval to poll at in milliseconds
const INTERVAL = 3000;
const BACKOFF = 5000;
let failedTries = 0;

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
    try {
        const res = await fetch("/poll");

        if (res.status >= 400) {
            throw new Error(`Request did not succeed: ${res.status}`);
        }

        const json = await res.json();

        allChat = json.msg;
        render();
        failedTries = 0;
    } catch (error) {
        console.error("polling error", error);
        failedTries++;
    }
}

function render() {
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
    async function rafTimer(time) {
        if (timeToMakeNextRequest <= time) {
            await cb();
            timeToMakeNextRequest = time + INTERVAL + BACKOFF * failedTries;
        }
        requestAnimationFrame(rafTimer);
    }

    requestAnimationFrame(rafTimer);
}

runPoll(getNewMsgs, INTERVAL);
