/**
 * Created by Jannes Peters on 10.12.2016.
 */
window.addEventListener("load", function() {
    "use strict";

    /**
     * Helper class for UI functions.
     */
    const UI_HELPER = new function () {
        let that = this;
        this.hideAll = function() {
            let elements = document.getElementsByClassName("hidableUIElement");
            for (let i = 0; i < elements.length; i++) {
                elements[i].addClass("hidden");
            }
        };
        this.showId = function(id) {
            that.hideAll();
            $(id).removeClass("hidden");
            //noinspection JSUnresolvedFunction
            window.dispatchEvent(new Event('resize'));
        };
        this.showError = function (msg) {
            console.log(msg);
        };
        this.showCorrectUI = function () {
            if (!GEOLOCATION.isAvailable()) {
                that.showId("geolocationWaiterUI");
            } else if (localStorage['recordedTrack'] != null && localStorage['recordedTrack'] != "") {
                that.showId("uploadTrackUI");
            } else {
                that.showId("recorderUI");
            }
        };
    }();
    Object.freeze(UI_HELPER);

    /**
     * Helper class for the geolocation.
     */
    const GEOLOCATION = new function () {
        let lastPosition = null;
        let intervalId = -1;
        let watchId = -1;

        let errorHandler = function (error) {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    UI_HELPER.showError("User denied the request for Geolocation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    UI_HELPER.showError("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    UI_HELPER.showError("The request to get user location timed out.");
                    break;
                case error.UNKNOWN_ERROR:
                    UI_HELPER.showError("An unknown error occurred.");
                    break;
            }
        };
        /**
         * Checks if the browser has geolocation functionality.
         * @returns {boolean}
         */
        this.isAvailable = function () {
            return !!navigator.geolocation;
        };
        /**
         * Function to get the geolocation.
         * @param callback
         */
        this.get = function(callback) {
            navigator.geolocation.getCurrentPosition(callback, errorHandler)
        };
        /**
         * Function to get the current position in regular time intervals. Let's the map look better.
         * @param callback function to be called when the request was successful
         * @param updateRate the time in ms between updates
         */
        this.getRegularly = function (callback, updateRate) {
            watchId = navigator.geolocation.watchPosition(function (pos) {
                lastPosition = pos;
            }, errorHandler);
            intervalId = window.setInterval(function () {
                callback(lastPosition);
            }, updateRate);
        };
        /**
         * Cancel the regular updates.
         */
        this.stopRegularUpdates = function () {
            window.clearInterval(intervalId);
            navigator.geolocation.clearWatch(watchId);
        };
        /**
         * Gets the current speed in m/s.
         * @returns {Number}
         */
        this.getSpeed = function () {
            if (lastPosition != null && lastPosition.speed != undefined) {
                return lastPosition.speed;
            } else { return 0; }
        };
        /**
         * Gets the current height in m.
         * @returns {Number}
         */
        this.getHeight = function () {
            if (lastPosition != null && !isNaN(lastPosition.altitude)) {
                return lastPosition.altitude;
            } else { return 0; }
        };

    }();
    Object.freeze(GEOLOCATION);

    /**
     * Object that handles recording of a track.
     * @constructor
     */
    let Recorder = function () {
        /**
         * Base gpx file as a base.
         * @type {string}
         */
        const GPX_BASE = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n<gpx xmlns=\"http://www.topografix.com/GPX/1/1\" version=\"1.1\" creator=\"myTrack\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\" http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd\"><metadata><time></time></metadata></gpx>";
        let that = this;
        let xmlTree = new DOMParser().parseFromString(GPX_BASE, "text/xml");
        xmlTree.getElementsByTagName("time")[0].textContent = new Date().toISOString();
        let trk = xmlTree.createElement("trk");
        trk.appendChild(xmlTree.createElement("name"));
        xmlTree.getElementsByTagName("gpx")[0].appendChild(trk);
        let currTrackSegment = null;

        /**
         * Start a new trkseg.
         */
        this.startTrackSegment = function() {
            if (currTrackSegment != null) that.endTrackSegment();
            currTrackSegment = xmlTree.createElement("trkseg");
            trk.appendChild(currTrackSegment);
            updateMetrics();
        };

        /**
         * End a trkseg.
         */
        this.endTrackSegment = function() {
            currTrackSegment = null;
            updateMetrics();
        };

        /**
         * Add a new point to the current trkseg.
         * @param pt
         */
        this.addTrkPt = function(pt) {
            if (currTrackSegment == null) throw new Error("There's no track segment started at the moment!");
            let trkpt = xmlTree.createElement("trkpt");
            trkpt.setAttribute("lat", pt.coords.latitude.toString());
            trkpt.setAttribute("lon", pt.coords.longitude.toString());
            let time = xmlTree.createElement("time");
            time.textContent = new Date().toISOString();
            trkpt.appendChild(time);
            if (pt.coords.altitude != null) {
                let ele = xmlTree.createElement("ele");
                ele.textContent = pt.coords.altitude;
                trkpt.appendChild(ele);
            }

            currTrackSegment.appendChild(trkpt);
            updateMetrics();
        };

        /**
         * Returns the current track as xml text.
         * @returns {string}
         */
        this.saveXml = function () {
            return new XMLSerializer().serializeToString(xmlTree);
        };

        /**
         * Checks if there's a current trkseg.
         * @returns {boolean}
         */
        this.isPaused = function () {
            return currTrackSegment == null;
        };

        /**
         * Exports the current track to the localStorage, overwriting the old one.
         */
        this.saveTrackToLocalStorage = function () {
            localStorage['recordedTrack'] = that.saveXml();
        };

        /**
         * Get a LatLng array for the whole track.
         * @returns {Array}
         */
        that.getLatLngArray = function() {
            let trackNodes = xmlTree.getElementsByTagName("trk")[0].getElementsByTagName("trkpt");
            let trackPoints = [];
            for (let i = 0; i < trackNodes.length; i++) {
                trackPoints[i] = new google.maps.LatLng(parseFloat(trackNodes[i].getAttribute("lat")), parseFloat(trackNodes[i].getAttribute("lon")));
            }
            return trackPoints;
        };

        /**
         * Get a LatLng array for the given segment.
         * @returns {Array}
         */
        that.getSegLatLngArray = function (i) {
            let trackNodes = xmlTree.getElementsByTagName("trkseg")[i].getElementsByTagName("trkpt");
            let trackPoints = [];
            for (let i = 0; i < trackNodes.length; i++) {
                trackPoints[i] = new google.maps.LatLng(parseFloat(trackNodes[i].getAttribute("lat")), parseFloat(trackNodes[i].getAttribute("lon")));
            }
            return trackPoints;
        };

        /**
         * Get the length of the track in m.
         * @returns {number}
         */
        that.calculateLength = function() {
            return google.maps.geometry.spherical.computeLength(that.getLatLngArray());
        };

        /**
         * Calculates the average spped til the current point.
         * @returns {number}
         */
        that.calculateAverageSpeed = function () {
            let trksegs = xmlTree.getElementsByTagName("trkseg");
            let trksum = 0;
            for (let i = 0; i < trksegs.length; i++) {
                let pts = trksegs[i].getElementsByTagName("trkpt");
                if (pts.length <= 1) break;
                let startTime = new Date(pts[0].getElementsByTagName("time")[0].textContent).getTime();
                let endTime = new Date(pts[pts.length - 1].getElementsByTagName("time")[0].textContent).getTime();
                let mLength = google.maps.geometry.spherical.computeLength(that.getSegLatLngArray(i));
                let timeInSeconds = (endTime - startTime) / 1000;
                trksum += mLength / timeInSeconds;
            }
            return trksum / trksegs.length;
        };

    };

    /**
     * Sets up all the UI listeners.
     */
    function setupEventListeners() {
        $("btnStartPauseRecording").addEventListener("click", function () {
            let type = $("btnStartPauseRecording").innerHTML;
            //switch button function depending on current state.
            switch (type) {
                case "Start":
                    recorder = new Recorder();
                    recorder.startTrackSegment();
                    GEOLOCATION.getRegularly(function (pt) {
                        recorder.addTrkPt(pt);
                    }, 10000);
                    $("btnStopRecording").removeAttribute("disabled");
                    break;
                case "Continue":
                    recorder.startTrackSegment();
                    GEOLOCATION.getRegularly(function (pt) {
                        recorder.addTrkPt(pt);
                    }, 10000);
                    break;
                case "Pause":
                    GEOLOCATION.stopRegularUpdates();
                    recorder.endTrackSegment();
                    break;
            }
            updateStartPauseButton();
        });

        $("btnStopRecording").addEventListener("click", function () {
            GEOLOCATION.stopRegularUpdates();
            recorder.endTrackSegment();
            recorder.saveTrackToLocalStorage();
            $("btnStartPauseRecording").setAttribute("disabled", "");
            UI_HELPER.showCorrectUI();
        });

        $("btnUploadTrack").addEventListener("click", function () {
            let xmlTree = new DOMParser().parseFromString(localStorage['recordedTrack'], "text/xml");
            let name = $("trackUploadName").value;
            writeNameToTrack(xmlTree, name);
            let gpx = new XMLSerializer().serializeToString(xmlTree);
            jannes.peters.MyTrack.api.sendApiRequest("is_track_name_free", {"name": name}, function (e) {
                //noinspection JSUnresolvedVariable
                let isFree = JSON.parse(e.responseText).isFree;
                if (isFree) {
                    localStorage.removeItem('recordedTrack');
                    jannes.peters.MyTrack.api.sendApiFormSubmit("upload_track_text", {"gpx": gpx, "name": name});
                } else {
                    UI_HELPER.showError("The name is already in use.");
                }
            }, function (req) {
                console.log(req.responseText);
                alert("Error submitting track!");
            });
        });

        $("btnSaveTrack").addEventListener("click", function () {
            let xmlTree = new DOMParser().parseFromString(localStorage['recordedTrack'], "text/xml");
            let name = $("trackUploadName").value;
            writeNameToTrack(xmlTree, name);
            let gpx = new XMLSerializer().serializeToString(xmlTree);
            let anchor = document.createElement("a");
            //open download dialog for the gpx
            let file = new Blob([gpx], {type: "application/gpx+xml"});
            //noinspection JSUnresolvedVariable,JSUnresolvedFunction
            anchor.href = URL.createObjectURL(file);
            anchor.download = name + ".gpx";
            anchor.click();
        });

        $("btnDeleteTrack").addEventListener("click", function () {
            if (confirm("Do you really want to delete the track?")) {
                localStorage.removeItem('recordedTrack');
                window.location.reload();
            }
        });
    }

    function writeNameToTrack(xml, name) {
        xml.getElementsByTagName("name")[0].textContent = name;
    }

    /**
     * Updates the style and text on the StartPauseButton.
     */
    function updateStartPauseButton() {
        let button = $("btnStartPauseRecording");
        if (recorder == null) {
            button.removeClass("btn-info");
            button.addClass("btn-success");
            button.setContentText("Start");
        } else if (recorder.isPaused()) {
            button.removeClass("btn-info");
            button.addClass("btn-success");
            button.setContentText("Continue");
        } else {
            button.removeClass("btn-success");
            button.addClass("btn-info");
            button.setContentText("Pause");
        }
    }

    /**
     * Updates the metric displays in recorder view.
     */
    function updateMetrics() {
        $("spanSpeed").setContentText(Math.roundPrecision(Math.metersPerSecondToKilometersPerHour(GEOLOCATION.getSpeed()), 2));
        $("spanHeight").setContentText(Math.roundPrecision(GEOLOCATION.getHeight(), 2));
        $("spanAvrgSpeed").setContentText(Math.roundPrecision(Math.metersPerSecondToKilometersPerHour(recorder.calculateAverageSpeed()), 2));
        $("spanCoveredTrack").setContentText(Math.roundPrecision(recorder.calculateLength(), 2));
    }
    let recorder = null;
    setupEventListeners();
    updateStartPauseButton();
    UI_HELPER.showCorrectUI();
});




