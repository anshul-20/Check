// (Number, Object) => Object
// eslint-disable-next-line
import {
    _QXE_APP
} from "./constants";
import {
    sourceParam
} from "./utils/url";

export const createEvent = (event_type_id, data = {}) => {
    // type checking
    if (typeof data !== "object") {
        return {
            error: "Parameter `data` must be an object"
        };
    }
    if (!event_type_id || typeof event_type_id !== "number") {
        return {
            error: "Parameter `event_type_id` (must be a Number) is missing or invalid."
        };
    }

    // `app_name` needs to be a string and passed down as either global window var or part of data object
    // data object key gets a priority
    const app_name = data.app_name || window._qxe_app_name;
    if (!app_name || typeof app_name !== "string") {
        return {
            error: "Please make sure you declare your app name by setting `window._qxe_app_name` or by passing it with `data` object."
        };
    }
    // check that app name is in the list
    if (!Object.values(_QXE_APP).includes(app_name)) {
        return {
            error: "Invalid app name. Please use window._QXE_APP to define your app name, i.e.: window._qxe_app_name.calculate_web"
        };
    }

    // `source` needs to be a string and passed down as either global window var or part of data object
    // `source` can also be implied from the URL GET parameter
    // the priority goes first to options/data key, then global window, then URL GET param
    const source = data.source || window._qxe_source || sourceParam();
    if (!source || typeof source !== "string") {
        return {
            error: "Please make sure you declare your source by setting `window._qxe_source`, by passing it with `data` object, or via GET param `qx_source`."
        };
    }

    // `category` needs to be a  string and is required for the 1000x events and sent with every event individually
    const category = data.category;
    if (
        Math.abs(event_type_id) > 999 &&
        (!category || typeof category !== "string")
    ) {
        return {
            error: "Please make sure you declare your category (String) by passing it with `data` object."
        };
    }

    const campaign_ad_id = data.campaign_ad_id;
    if (
        Math.abs(event_type_id) > 999 &&
        campaign_ad_id &&
        typeof campaign_ad_id !== "number"
    ) {
        return {
            error: "Please make sure that your `campaign_ad_id` is a type of Number."
        };
    }

    // data constructor
    return {
        data: [{
            type: "event",
            attributes: {
                // pre-built data
                client_timestamp: new Date()
                    .toISOString()
                    .replace("T", " ")
                    .replace("Z", ""),
                browser: navigator.userAgent,
                url: window && window.location && window.location.href,

                // read app name from initializer variable
                app_name,

                // read source from initializer variable
                source,

                // overwirte with data param object
                ...data,

                // required parameters converted to object keys
                event_type_id: process.env.NODE_ENV === "development" ?
                    event_type_id > 0 ? // in dev mode, all events will be negative,
                    // to ensure the data is easily identifiable as a test
                    -event_type_id :
                    event_type_id :
                    event_type_id
            }
        }]
    };
};