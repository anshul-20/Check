import {
    now
} from "./utils/throttle/now";

export const THROTTLE_DEFAULTS = {
    RECENCY: 150, // this is milliseconds
    SESSION: 30 * 60 // 30 minutes (UNIX clock is in seconds)
};

export const NAMING_DEFAULTS = {
    SESSION_STORAGE: "_qxe_session_event_history",
    RECENCY_STORAGE: "_qxe_recent_event_history",
    USER_STORAGE: "_qxe_user_basic",
    GET_SOURCE: "qx_source"
};

export const SESSION_STORAGE_INIT = {
    events: {},
    expires: now() + THROTTLE_DEFAULTS.SESSION
};

export const SESSION_EVENT_IDS = {
    110: true,
    111: true,
    210: true,
    211: true,
    410: true,
    411: true,
    1000: true
};

export const _QXE_APP = {
    READ_IOS: "read_ios",
    READ_ANDROID: "read_android",
    READ_WEB: "read_web",
    READ_API: "read_api",
    CALCULATE_IOS: "calculate_ios",
    CALCULATE_ANDROID: "calculate_android",
    CALCULATE_WEB: "calculate_web",
    CALCULATE_API: "calculate_api",
    LEARN_WEB: "learn_web",
    LEARN_API: "learn_api",
    SSO_WEB: "sso_web",
    ACCOUNTS_API: "accounts_api",
    ANALYTICS_API: "analytics_api",
    ANALYTICS_WEB: "analytics_web"
};

export const MESSAGES = {
    ERRORS: {
        500.1: "`sessionStorage` and/or `localStorage` not available. Will not be managing user data for fast loading."
    }
};