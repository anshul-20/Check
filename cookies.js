export const typeCheck = name => {
    if (typeof name !== "string")
        throw new Error(
            "Cookie name is required and needs to be tyeof === 'string'."
        );
};

export const getCookie = name => {
    typeCheck(name);
    const result = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
    return result ? result.pop() : "";
};

export const setCookie = (name, value = "", hours = 1) => {
    typeCheck(name);
    const date = new Date();
    date.setTime(date.getTime() + hours * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value ? value : ""}; ${expires}; path=/`;
};

export const deleteCookie = name => {
    typeCheck(name);
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
};