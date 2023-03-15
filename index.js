import "core-js/es/promise";

import axios from "axios";
import bugsnag from "@bugsnag/js";

import {
    _QXE_APP
} from "./constants";
import throttle from "./utils/throttle";

// init window store for history object
window._qxe_recent_event_history = {};

// run a dirty check (order of keys needs to be the same) on enum object
// to ensure that the user typed correct app name; wrong app names will throw
// and terminate requests
const validNames = Object.values(_QXE_APP);
if (!validNames.includes(window._qxe_app_name)) {
    throw new Error(
        `Your \`window._qxe_app_name\` is invalid. Accepted values are:${validNames.map(
            name => {
                return " " + name;
            }
        )}.`
    );
}
// init bugsnag in production mode only
if (process.env.NODE_ENV === "produciton") {
    bugsnag({
        apiKey: "0f9c9b0dd912d25e91d8e0dff95255ef",
        appVersion: process.env.VERSION
    });
}

// construct control object
export const analyticsAPI = {
    test: () =>
        axios
        .get(process.env.EVENTS_API_ROUTE + "/healthcheck")
        .then(response => {
            return response.status === 200 ?
                {
                    status: "OK"
                } :
                {
                    status: "ERROR",
                    response
                };
        })
        .catch(error => {
            return {
                status: "ERROR",
                error
            };
        }),
    send: throttle
};

// add function to window scope
window._qxe = analyticsAPI;