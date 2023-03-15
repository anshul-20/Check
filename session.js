import {
    MESSAGES
} from "../../constants";

// get & parse session data or initialize default session history object
import {
    NAMING_DEFAULTS,
    SESSION_EVENT_IDS,
    SESSION_STORAGE_INIT,
    THROTTLE_DEFAULTS
} from "../../constants";
import {
    now
} from "./now";

export const getSessionEventHistoryObject = () => {
    try {
        return (
            JSON.parse(
                sessionStorage.getItem(NAMING_DEFAULTS.SESSION_STORAGE)
            ) || SESSION_STORAGE_INIT
        );
    } catch (error) {
        // eslint-disable-next-line
        console.error(MESSAGES.ERRORS[500.1], error);
        return SESSION_STORAGE_INIT;
    }
};

// updates session expiration date
export const sessionPing = () => {
    try {
        return sessionStorage.setItem(
            NAMING_DEFAULTS.SESSION_STORAGE,
            JSON.stringify({
                events: getSessionEventHistoryObject().events,
                expires: now() + THROTTLE_DEFAULTS.SESSION
            })
        );
    } catch (error) {
        // eslint-disable-next-line
        console.error(MESSAGES.ERRORS[500.1], error);
    }
};

export const isSessionEvent = event_type_id => {
    const isProductionSessionEvent = SESSION_EVENT_IDS[event_type_id];
    const isDevelopmentSessionEvent = SESSION_EVENT_IDS[-event_type_id];
    return isProductionSessionEvent || isDevelopmentSessionEvent;
};