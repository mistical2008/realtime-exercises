const chat = document.getElementById("chat");
const msgs = document.getElementById("msgs");

// let's store all current messages here
let allChat = [];

// the interval to poll at in milliseconds
const INTERVAL = 3000;
const INTERVAL_ON_FILED = 1000;
const MAX_TRIES = 3;
const BACKOFF = 5000;
let FAILED_TRIES = 0;

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
        FAILED_TRIES = 0;
    } catch (error) {
        console.error("polling error", error);
        FAILED_TRIES++;
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
 * @description - if failed tries greater than maxTries, then backoff
 * @param {number} arg.failedTries - number of failed requests
 * @param {number} arg.maxTries - number of maximum failed requests without backoff
 * @param {number} arg.backoff - time in ms
 * @returns {number}
 */
function getBackoffOnMaxTries({ failedTries, maxTries, backoff = 3000 }) {
    return failedTries <= maxTries ? 0 : backoff;
}

function getInterval({ failedTries, interval, intervalOnFiled }) {
    if (failedTries > 0 && failedTries <= MAX_TRIES) {
        return intervalOnFiled;
    }
    return interval;
}

/**
 * @description - calculate time to make next request
 * @param {number} arg.time - time in ms
 * @param {number} arg.interval - time in ms
 * @param {number} arg.backoff - time in ms
 * @param {number} arg.failedTries - number of failed requests
 * @returns {number}
 */
function calculateTimeToNextReq({ time, interval, backoff, failedTries }) {
    return time + interval + backoff * failedTries;
}

/**
 * @description runs poll in focused window. When leaves window, then stop polling
 * @param {any} cb - callback to run on every interval
 * @param {any} INTERVAL - time in ms
 * @returns {void}
 */
function runPoll(cb, INTERVAL, startTime = 0) {
    let timeToMakeNextRequest = startTime;

    /**
     * @description timer based on requestAnimationFrame
     * @param {any} time - time in ms passed by requestAnimationFrame (started from 0)
     * @returns {void}
     */
    async function rafTimer(time) {
        if (timeToMakeNextRequest <= time) {
            await cb();
            timeToMakeNextRequest = calculateTimeToNextReq({
                time,
                interval: getInterval({
                    failedTries: FAILED_TRIES,
                    interval: INTERVAL,
                    intervalOnFiled: INTERVAL_ON_FILED,
                }),
                backoff: getBackoffOnMaxTries({
                    backoff: BACKOFF,
                    maxTries: MAX_TRIES,
                    failedTries: FAILED_TRIES,
                }),
                failedTries: FAILED_TRIES,
            });
        }
        requestAnimationFrame(rafTimer);
    }

    requestAnimationFrame(rafTimer);
}

runPoll(getNewMsgs, INTERVAL);
