import axios from "axios";

import {
    getCookie
} from "./cookies";

export const getSession = () => getCookie("qx_sid") || getCookie("sessionID");

// Object => Promise
export const getUser = credentials => {
    if (!credentials.token || !credentials.id)
        return Promise.reject(new Error("Invalid user credentials"));

    // fetch user data
    return axios.request({
        url: `${process.env.ACCOUNTS_API_ROUTE}/v1/users/${credentials.id}`,
        method: "GET",
        headers: {
            "x-qxmd-api-key": process.env.ACCOUNTS_API_KEY,
            "x-qxmd-auth-token": credentials.token,
            "Content-Type": "application/json; charset=utf8"
        }
    });
};

// () => Promise
export const validateUser = () => {
    // attempt to locate session ID
    const session = getSession();

    // reject validation if no user session found
    // rejections are allowed to fallthrough to allow data reach API, even if there's no user association
    if (!session) return Promise.reject({
        error: "No sessionID cookie found"
    });
    // query API with session ID.
    return axios.request({
        url: `${process.env.ACCOUNTS_API_ROUTE}/v1/sessions/${session}`,
        method: "GET",
        headers: {
            "x-qxmd-api-key": process.env.ACCOUNTS_API_KEY,
            "Content-Type": "application/json; charset=utf8"
        }
    });
};