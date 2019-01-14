/**
 * Created by Jannes Peters on 01.12.2016.
 */

/**
 * Class to manage the loading indicator.
 */
const LoadingIndicator = new function() {
    let currLoading = 0;
    this.startLoading = function() {
        currLoading++;
        document.getElementById("loadingIndicator").className = "";
    };
    this.stopLoading = function() {
        if (--currLoading <= 0) {
            currLoading = 0;
            document.getElementById("loadingIndicator").className = "hidden";
        }
    };
}();
Object.freeze(LoadingIndicator);