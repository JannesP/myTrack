/**
 * Created by Jannes Peters on 10.12.2016.
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Creates an HTMLElement with the given tag and text inside.
 * @param tag
 * @param text
 * @returns {Element}
 */
HTMLDocument.prototype.createElementWithText = function (tag, text) {
    let element = this.createElement(tag);
    element.appendChild(this.createTextNode(text));
    return element;
};

/**
 * function to remove all childs
 */
HTMLElement.prototype.clear = function () {
    while (this.firstChild) {
        this.removeChild(this.firstChild);
    }
};

/**
 * adds the given class to the element
 * @param {string} className
 */
HTMLElement.prototype.addClass = function (className) {
    this.removeClass(className);
    let currClassName = (!this.className ? "" : this.className);
    currClassName = " " + currClassName + " ";
    if (currClassName.indexOf(" " + className + " ", 0) === -1) {
        currClassName += className;
    }
    currClassName = currClassName.trim();
    if (this.className !== currClassName) {
        this.className = currClassName;
    }
};
/**
 * removes the given class from the element
 * @param {string} className
 */
HTMLElement.prototype.removeClass = function (className) {
    let currClassName = this.className;
    if (currClassName === className) {
        currClassName = "";
    } else {
        currClassName = " " + currClassName + " ";  //prevent removal of partial names (eg. active->example_active)
        currClassName = currClassName.replace(" " + className + " ", "").replace("  ", "");
    }
    this.className = currClassName.trim();
};
/**
 * Sets the text of an element.
 * @param {string} text
 */
HTMLElement.prototype.setContentText = function(text) {
    this.clear();
    this.appendChild(document.createTextNode(text));
};

/**
 * Takes an array or number of values and prints the max, ignoring all the NaN that might be in there.
 * @param values
 * @returns {Number} NaN if ther were no number in the  values
 */
Math.fuzzyMax = function(...values) {
    let max = NaN;
    for (let i = 0; i < values.length; i++) {
        if (!isNaN(values[i])) {
            if (isNaN(max) || max < values[i]) {
                max = values[i];
            }
        }
    }
    return max;
};

/**
 * Simple m/s to km/h function.
 * @param {number} mPs
 * @returns {number}
 */
Math.metersPerSecondToKilometersPerHour = function(mPs) {
    return mPs * (3600 / 1000);
};

/**
 * Rounds to the given precision.
 * @param {number} value the value to round
 * @param {number} precision the precision to output
 * @returns {number}
 */
Math.roundPrecision = function(value, precision) {
    let powersOf10 = Math.pow(10, precision || 0);
    return Math.round(value * powersOf10) / powersOf10;
};

//enables the class centerTextY since it's completely absent from css/html
(function() {
    "use strict";
    window.addEventListener("load", function() {
        function centerTextY() {
            let elements = document.getElementsByClassName("centerTextY");
            for (let i = 0; i < elements.length; i++) {
                elements[i].style.lineHeight = window.getComputedStyle(elements[i]).getPropertyValue("height");
            }
        }
        window.addEventListener("resize", function () {
            centerTextY();
        });
        centerTextY();
    });
})();