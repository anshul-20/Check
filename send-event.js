// request constructor
import axios from "axios";

import {
    MESSAGES,
    NAMING_DEFAULTS
} from "./constants";
import {
    getSession,
    getUser,
    validateUser
} from "./utils/user";
import {
    isSessionEvent
} from "./utils/throttle/session";
import {
    sessionUnique
} from "./utils/throttle";

// Object => Promise
export const request = (data, options = {}) =>
    axios.request({
        url: `${process.env.EVENTS_API_ROUTE}/api/v2/events${
            options.skipIPWhenAnon ? "?anon=1" : ""
        }`,
        method: "POST",
        headers: {
            "x-qxmd-api-key": process.env.EVENTS_API_KEY,
            "Content-Type": "application/json; charset=utf8"
        },
        data
    });

// Object => Promise
// this function returns a promise to be later used for retries
export const sendEvent = (payload, options = {}) => {
    if (payload.error) {
        return Promise.reject(new Error(payload.error));
    }
    // decode payload, assuming we are not using batch events
    const eventData =
        payload.data && payload.data[0] ?
        payload.data[0] :
        {
            // defaults/failsafe
            type: "event",
            attributes: {}
        };
    const {
        attributes,
        type
    } = eventData;
    const {
        event_type_id
    } = eventData.attributes;

    // automatically attempt to fetch user info
    if (!attributes.user_id) {
        // if Medscape SSO's Pagemetadata object is found, it will be used to send user data
        if (window.Pagemetadata || window.PageMetadata) {
            try {
                const {
                    userSegVars,
                    addProfile
                } =
                window.Pagemetadata || window.PageMetadata;
                const sendWhenTruthy = (val, parse = false) => {
                    if (parse) return val ? parseInt(val) : undefined;
                    return val ? val : undefined;
                };

                return request({
                    data: [{
                        type,
                        attributes: {
                            ...attributes,
                            user_id: sendWhenTruthy(
                                userSegVars.QXMD_ID,
                                true
                            ),
                            medscape_guid: sendWhenTruthy(
                                userSegVars.gd,
                                true
                            ), // non-truthy values will not be sent
                            medscape_profession_id: sendWhenTruthy(
                                userSegVars.pf,
                                true
                            ),
                            medscape_profession_name: sendWhenTruthy(
                                addProfile.profdesc
                            ),
                            medscape_specialty_id: sendWhenTruthy(
                                addProfile.spid,
                                true
                            ),
                            medscape_specialty_name: sendWhenTruthy(
                                addProfile.spdesc
                            ),
                            medscape_occupation_id: sendWhenTruthy(
                                addProfile.occid,
                                true
                            ),
                            medscape_country_id: sendWhenTruthy(
                                addProfile.co
                            )
                        }
                    }]
                }, {
                    ...options,
                    // overrides request to skip tracking user IP if user data is available
                    skipIPWhenAnon: false
                });
            } catch (error) {
                // print console error and send to BugSnag
                // eslint-disable-next-line
                console.error("Could not send Medscape SSO data.", error);
            }
        }

        // ensure that user is actually logged in
        const session = getSession();
        let localUserData;
        try {
            // if user has logged out, clear out previously saved user data
            if (!session)
                sessionStorage.removeItem(NAMING_DEFAULTS.USER_STORAGE);

            // check sessionStorage for saved user data
            localUserData = JSON.parse(
                sessionStorage.getItem(NAMING_DEFAULTS.USER_STORAGE)
            );
        } catch (error) {
            // eslint-disable-next-line
            console.error(MESSAGES.ERRORS[500.1], error);
        }

        if (localUserData && localUserData.user_id) {
            // session events (as defined by user) are throttled by sessionUnique function
            if (
                (event_type_id && options.sessionEvent) ||
                isSessionEvent(event_type_id)
            ) {
                const sessionEventCheckResolution = sessionUnique(
                    event_type_id,
                    localUserData,
                    options
                );
                if (sessionEventCheckResolution.status !== "OK")
                    return Promise.resolve(sessionEventCheckResolution);
            }
            return request({
                data: [{
                    type,
                    attributes: {
                        ...attributes,
                        ...localUserData
                    }
                }]
            }, {
                ...options,
                // overrides request to skip tracking user IP if user data is available
                skipIPWhenAnon: false
            });
        }
        // if no user data saved in LS, query the API
        return validateUser()
            .then(response => {
                const credentials = {
                    id: response.data.data.id,
                    token: response.data.data.attributes.token
                };
                return getUser(credentials);
            })
            .then(response => {
                const user = response.data.data;
                // create user data object
                const userData = user.id ?
                    {
                        user_id: user.id,
                        profession_id: user.attributes.profession_id,
                        specialty_id: user.attributes.specialty_id,
                        location_id: user.attributes.location_id
                    } :
                    {};
                // to save future requests, save user data into sessionStorage
                if (user.id) {
                    sessionStorage.setItem(
                        NAMING_DEFAULTS.USER_STORAGE,
                        JSON.stringify(userData)
                    );
                }

                // session events (as defined by user) are throttled by sessionUnique function
                if (
                    (event_type_id && options.sessionEvent) ||
                    isSessionEvent(event_type_id)
                ) {
                    const sessionEventCheckResolution = sessionUnique(
                        event_type_id,
                        userData,
                        options
                    );
                    if (sessionEventCheckResolution.status !== "OK")
                        return Promise.resolve(sessionEventCheckResolution);
                }

                // send request to Events API with user data
                return request({
                    data: [{
                        type,
                        attributes: {
                            ...attributes,
                            ...userData
                        }
                    }]
                }, {
                    ...options,

                    // overrides request to skip tracking user IP if user data is available
                    skipIPWhenAnon: false
                });
            })
            .catch(() => {
                // send payload w/o user details if unable to get user for any reason

                // must still run a duplicate event test
                if (
                    (event_type_id && options.sessionEvent) ||
                    isSessionEvent(event_type_id)
                ) {
                    const sessionEventCheckResolution = sessionUnique(
                        event_type_id,
                        localUserData || {},
                        options
                    );
                    if (sessionEventCheckResolution.status !== "OK")
                        return Promise.resolve(sessionEventCheckResolution);
                }

                return request(payload, {
                    ...options,

                    // overrides request to skip tracking user IP if user data is available
                    skipIPWhenAnon: attributes.user_id ?
                        false :
                        options.skipIPWhenAnon
                });
            });
    }
    // or proceed without fetching user data
    return request(payload, {
        ...options,

        // overrides request to skip tracking user IP if user data is available
        skipIPWhenAnon: attributes.user_id ? false : options.skipIPWhenAnon
    });
};