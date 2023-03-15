import {
    MESSAGES,
    NAMING_DEFAULTS,
    THROTTLE_DEFAULTS
} from "../../constants";
import {
    createEvent
} from "../../create-event";
import {
    getSessionEventHistoryObject,
    sessionPing
} from "./session";
import {
    now
} from "./now";
import {
    sendEvent
} from "../../send-event";

// limits output to one per session
export const sessionUnique = (event_type_id, userData, options) => {
    if (!userData)
        throw "`sessionUnique` function must receive `userData` parameter to be able to determine whether the event is unique or repeat.";
    let sessionEventHistory = getSessionEventHistoryObject();

    // sessions are assumed to be repeat by default:
    let resolution = {
        status: "skipped",
        reason: "You have requested to only send one event per session, or it has been automatically selected based on your event type.",
        params: {
            event_type_id,
            eventData: userData,
            options
        }
    };

    // unique session resolution template
    const isUnique = {
        ...resolution,
        status: "OK",
        reason: "This is a new event for this user session."
    };

    // reset session if expiration time has passed
    if (sessionEventHistory.expires <= now()) {
        sessionEventHistory = {
            ...sessionEventHistory,
            expires: now() + THROTTLE_DEFAULTS.SESSION
        };
        resolution = isUnique;
    }
    // look for previous session event calls
    const sessionEventData = sessionEventHistory.events[event_type_id];

    // compare user objects
    if (sessionEventData) {
        ["location_id", "profession_id", "specialty_id", "user_id"].forEach(
            item => {
                if (userData[item] !== sessionEventData[item])
                    resolution = {
                        ...resolution,
                        status: "OK",
                        reason: "This is an updated session event for this user session."
                    };
            }
        );
    } else {
        // if no previous session history found, it is unique
        resolution = isUnique;
    }

    // update session storage data
    try {
        sessionStorage.setItem(
            NAMING_DEFAULTS.SESSION_STORAGE,
            JSON.stringify({
                events: {
                    ...sessionEventHistory.events,
                    [event_type_id]: userData
                },
                expires: now() + THROTTLE_DEFAULTS.SESSION
            })
        );
    } catch (error) {
        // eslint-disable-next-line
        console.error(MESSAGES.ERRORS[500.1], error);
    }

    return resolution;
};

// limits output to once per THROTTLE_DEFAULTS.RECENCY (as of this writing, 150ms)
export const recentUnique = event_type_id => {
    // drop event if it's in the 'recents' records
    if (window[NAMING_DEFAULTS.RECENCY_STORAGE][event_type_id]) return false;

    // if allowed to proceed, add event to 'recents' records as it's about to be sent
    window[NAMING_DEFAULTS.RECENCY_STORAGE][event_type_id] = true;
    window.setTimeout(() => {
        // remove from 'recents' records after time delay (i.e. when it's no longer 'recent')
        window[NAMING_DEFAULTS.RECENCY_STORAGE][event_type_id] = false;
    }, THROTTLE_DEFAULTS.RECENCY);

    return true;
};

// (Number, Object, Object) => Promise
export default (event_type_id, data, options = {}) => {
    return new Promise((resolve, reject) => {
        // any event request should update the session expiration time
        sessionPing();

        // all events are screened for recent uniqueness (against THROTTLE_DEFAULTS.RECENCY min delay)
        // as of this writing, that's 150ms
        if (recentUnique(event_type_id)) {
            // success
            const eventPayload = createEvent(event_type_id, data);
            return sendEvent(eventPayload, options)
                .then(response => {
                    // pass up the resolution from sendEvent return
                    // if it looks like the request was skipped
                    // due to session uniqueness check not passing
                    if (
                        response &&
                        response.status &&
                        response.status === "skipped"
                    )
                        return resolve(response);

                    return resolve({
                        status: "sent",
                        reason: "Event created and sent successfully.",
                        params: {
                            event_type_id,
                            data,
                            options
                        }
                    });
                })
                .catch(error => {
                    // monitor Events API response
                    if (!error.data) throw error;
                    const {
                        data
                    } = error.response;
                    const errors = data.errors || [{}];
                    const firstErrorCode = errors[0].code;
                    const firstErrorDescription = errors[0].description;

                    // custom error message with explaination of exactly what may have gone wrong
                    const errorMessages = {
                        InvalidAppName: "Your `app_name` has passed Events SDK validation but the Events API server rejected it."
                    };
                    const message = `${
                        errorMessages[firstErrorCode]
                            ? errorMessages[firstErrorCode]
                            : firstErrorDescription
                    }`;

                    // if the user does not have a .catch(), their code will throw 'unhandled' error.
                    return reject(message);
                });
        }

        // throttled
        return resolve({
            status: "skipped",
            reason: `A delay of ${THROTTLE_DEFAULTS.RECENCY}ms is enforced between repeat events.`,
            params: {
                event_type_id,
                data,
                options
            }
        });
    });
};