/**
 * Created by Jannes Peters on 11.12.2016.
 */
let jannes = {};
jannes.peters = {};
jannes.peters.MyTrack = {};
jannes.peters.MyTrack.api = {};

/**
 * Sends an api request with FormData
 * @param {string} type
 * @param {FormData} formdata
 * @param {function} callback
 * @param {function} errorCallback
 */
jannes.peters.MyTrack.api.sendApiRequestWithFormData = function(type, formdata, callback, errorCallback) {
    let req = new XMLHttpRequest();
    req.open("POST", "api.php", true);
    req.onreadystatechange = function() {
        if(req.readyState == 4) {
            if (req.status == 200) {
                callback(req);
            } else {
                if (errorCallback != null) {
                    errorCallback(req);
                }
            }
        }
    };
    formdata.append("type", type);
    req.send(formdata);
};

/**
 * Sends an api request.
 * @param {string} type
 * @param {Object} data - a simple object with key-value pairs as strings
 * @param {function} callback
 * @param {function} errorCallback
 */
jannes.peters.MyTrack.api.sendApiRequest = function(type, data, callback, errorCallback) {
    let req = new XMLHttpRequest();
    req.open("POST", "api.php", true);
    req.onreadystatechange = function() {
        if(req.readyState == 4) {
            if (req.status == 200) {
                callback(req);
            } else {
                errorCallback(req);
            }
        }
    };
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    let reqData = "type=" + type;
    if (data != undefined) {
        for (let property in data) {
            if (data.hasOwnProperty(property)) {
                reqData += "&" + encodeURIComponent(property) + "=" + encodeURIComponent(data[property]);
            }
        }
    }
    req.send(reqData);
};

/**
 * Send an api request with a hidden form. This will send you to analyser.php!
 * @param {string} type
 * @param {Object} data a key/value map
 */
jannes.peters.MyTrack.api.sendApiFormSubmit = function(type, data) {
    let form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "api.php");
    form.addClass("hidden");
    form.appendChild(getInput("type", type));
    if (data != undefined) {
        for (let property in data) {
            if (data.hasOwnProperty(property)) {
                form.appendChild(getInput(property, data[property]));
            }
        }
    }
    let button = document.createElement("button");
    button.setAttribute("type", "submit");
    form.appendChild(button);
    document.body.appendChild(form);
    button.click();
    setTimeout(function() {document.body.removeChild(form);}, 0);

    function getInput(name, value) {
        let input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("name", name);
        input.setAttribute("value", value);
        return input;
    }
};
//make the api immutable
Object.freeze(jannes.peters.MyTrack.api);
Object.freeze(jannes.peters.MyTrack);
Object.freeze(jannes.peters);
Object.freeze(jannes);