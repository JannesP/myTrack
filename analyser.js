/**
 * Created by Jannes Peters on 28.11.2016.
 */
window.addEventListener("load", function() {
    "use strict";
//##########################################################################################################
//######################################### MISCELLANEOUS ##################################################
//##########################################################################################################
    //fixes all canvi by resizing them always to fit their parents size since setting the canvas size in css makes it blurry.
    function canvasFix() {
        function fixCanvi() {
            let canvasElements = document.getElementsByTagName("canvas");
            for (let i = 0; i < canvasElements.length; i++) {
                canvasElements[i].setAttribute("width", window.getComputedStyle(canvasElements[i].parentNode).getPropertyValue("width"));
                canvasElements[i].setAttribute("height", window.getComputedStyle(canvasElements[i].parentNode).getPropertyValue("height"));
            }
        }
        window.addEventListener("resize", fixCanvi);
        fixCanvi();
    }
    canvasFix();

    function showError(message) {
        alert("Error: " + message);
    }

    let currentUser = $("username").innerHTML;
    let trackList = null;
    let trackListShared = null;
    let trackListPublic = null;
    let currentTrack = null;

    /**
     * Reload the complete UI, basically resetting the page.
     */
    function reloadUI() {
        loadOwnTracks();
        loadSharedTracks();
        loadPublicTracks();
        currentTrack = null;
        refreshUI();
    }

    /**
     * Refreshing the UI, basically updating the view and updating all variables.
     */
    function refreshUI() {
        if (currentTrack == null) {
            $("options").addClass("invisible");
            $("content").addClass("invisible");
        } else {
            $("content").removeClass("invisible");
            if (currentTrack.isOwn()) {
                refreshOptions();
            } else {
                $("options").addClass("invisible");
            }
            displayTrackContent();
        }
    }

    /**
     * Refresh the options bar.
     */
    function refreshOptions() {
        $("options").removeClass("invisible");
        $("btnSaveTrackChanges").setAttribute("disabled", "");
        $("trackRename").value = currentTrack.getName();
        $("checkBoxTrackPublic").checked = currentTrack.isPublic();
        //setup shared with
        let selectSharedWith =  $("selectSharedWith");
        selectSharedWith.clear();
        if (currentTrack.getShares().length === 0) {
            selectSharedWith.setAttribute("disabled", "");
            $("btnTrackRemoveShare").setAttribute("disabled", "");
        } else {
            selectSharedWith.removeAttribute("disabled");
            $("btnTrackRemoveShare").removeAttribute("disabled");
            let documentFragment = document.createDocumentFragment();
            for (let i = 0; i < currentTrack.getShares().length; i++) {
                let option = document.createElementWithText("option", currentTrack.getShares()[i]);
                option.value = currentTrack.getShares()[i];
                documentFragment.appendChild(option);
            }
            selectSharedWith.appendChild(documentFragment);
        }
    }

    /**
     * Loads the track content.
     */
    function displayTrackContent() {
        displayMetrics();
        displayMap();
    }

    /**
     * Displays the track metrics.
     */
    function displayMetrics() {
        $("trackName").setContentText(currentTrack.getName());
        $("trackOwner").setContentText(currentTrack.getOwner());
        $("trackDate").setContentText(new Date(currentTrack.getTime()).toDateString());
        $("trackLength").setContentText(Math.roundPrecision(currentTrack.calculateLength() / 1000, 2));
        if (currentTrack.hasElevationData()) {
            $("trackAccHeight").setContentText(Math.roundPrecision(currentTrack.calculateAccumulatedHeight(), 2));
            $("trackMaxHeight").setContentText(Math.roundPrecision(currentTrack.calculateMaximumHeight(), 2));
        } else {
            $("trackAccHeight").setContentText("No elevation data available.");
            $("trackMaxHeight").setContentText("No elevation data available.");
        }
        if (currentTrack.hasTimeData()) {
            $("trackAvrgSpeed").setContentText(Math.roundPrecision(Math.metersPerSecondToKilometersPerHour(currentTrack.calculateAverageSpeed()), 2));
            $("trackMaxSpeed").setContentText(Math.roundPrecision(Math.metersPerSecondToKilometersPerHour(currentTrack.calculateMaximumSpeed()), 2));
        } else {
            $("trackAvrgSpeed").setContentText("No time data available.");
            $("trackMaxSpeed").setContentText("No time data available.");
        }
        DIAGRAM_HELPER.reloadAll();
    }

    /**
     * Displays the map, incuding waypoints etc.
     */
    function displayMap() {
        MapHelper.clearTracks();
        for (let i = 0; i < trackList.getLength(); i++) {
            MapHelper.loadTrack(trackList.get(i));
        }
        for (let i = 0; i < trackListShared.getLength(); i++) {
            MapHelper.loadTrack(trackListShared.get(i));
        }
        for (let i = 0; i < trackListPublic.getLength(); i++) {
            if (!trackListPublic.get(i).isOwn())
                MapHelper.loadTrack(trackListPublic.get(i));
        }
        MapHelper.showTrack(currentTrack);
    }

    /**
     * Helper class with functions for the map.
     */
    let MapHelper = new function() {
        let that = this;
        let loadedTracks = {};
        let markers = [];
        let map = new google.maps.Map($('google-map'), {
            center: {lat: -34.397, lng: 150.644},
            zoom: 8
        });

        /**
         * Clears all displayed tracks.
         */
        that.clearTracks = function() {
            while (markers.length > 0) {
                markers.pop().setMap(null);
            }
            for (let property in loadedTracks) {
                if (loadedTracks.hasOwnProperty(property)) {
                    loadedTracks[property].setMap(null);
                    delete loadedTracks[property];
                }
            }
        };

        /**
         * Shows the track on the map.
         * @param {Track} track
         */
        that.showTrack = function(track) {
            loadedTracks[track.getId()].setVisible(true);
        };

        /**
         * Hides the track from the map.
         * @param {Track} track
         */
        that.hideTrack = function(track) {
            loadedTracks[track.getId()].setVisible(false);
        };

        /**
         * Loads the track for display.
         * @param {Track} track
         */
        that.loadTrack = function(track) {
            let points = track.getLatLngArray();
            let polyOptions = {
                path: points,
                strokeColor: '#333333',
                strokeOpacity: 1.0,
                strokeWeight: 2
            };
            if (track === currentTrack) {
                let mapbounds = new google.maps.LatLngBounds();
                let vectors = track.getLatLngArray();
                for (let i = 0; i < vectors.length; i++) {
                    mapbounds.extend(vectors[i]);
                }
                map.fitBounds(mapbounds);
                map.setCenter(vectors[0]);
                map.setZoom(map.getZoom() - 1);
                polyOptions.editable = track.isOwn();
                polyOptions.zIndex = 2.0;
                polyOptions.strokeWeight = 2.5;
                polyOptions.strokeColor = '#FF0000';
            }
            let  currentLine = new google.maps.Polyline(polyOptions);

            let marker = new google.maps.Marker({
                map: map,
                draggable: false,
                position: currentLine.getPath().getAt(0),
                title: track.getName()
            });
            markers.push(marker);
            if (track != currentTrack) {
                marker.setIcon("https://maps.google.com/mapfiles/ms/icons/blue-dot.png");
                marker.addListener('click',
                    (function(polyline) {
                        return function() {
                            let visible = polyline.getVisible();
                            polyline.setVisible(!visible);
                        }
                    })(currentLine)
                );
            }
            if (polyOptions.editable) {
                google.maps.event.addListener(currentLine, 'rightclick',
                    (function(track, polyline) {
                        return function (e) {
                            // Check if click was on a vertex control point
                            if (e.vertex == undefined) {
                                return;
                            }
                            polyline.getPath().removeAt(e.vertex);
                        };
                    })(track, currentLine)
                );
                google.maps.event.addListener(currentLine.getPath(), "insert_at",
                    (function(track, polyline) {
                        return function (e) {
                            track.addLatLngAt(e, polyline.getPath().getAt(e));
                            displayMetrics();
                            $("btnSaveTrackChanges").removeAttribute("disabled");
                        };
                    })(track, currentLine)
                );
                google.maps.event.addListener(currentLine.getPath(), "remove_at",
                    (function(track, polyline) {
                        return function (e) {
                            track.removeLatLngAt(e);
                            displayMetrics();
                            $("btnSaveTrackChanges").removeAttribute("disabled");
                        };
                    })(track, currentLine)
                );
                google.maps.event.addListener(currentLine.getPath(), "set_at",
                    (function(track, polyline) {
                        return function (e) {
                            track.setLatLngAt(e, polyline.getPath().getAt(e));
                            displayMetrics();
                            if (e === 0) {
                                marker.setPosition(polyline.getPath().getAt(e));
                            }
                            $("btnSaveTrackChanges").removeAttribute("disabled");
                        };
                    })(track, currentLine)
                );
            }
            loadedTracks[track.getId()] = currentLine;
            currentLine.setVisible(false);
            currentLine.setMap(map);
        };
    }();

    /**
     * Creates a track object.
     * @param {string} owner
     * @param {string} name
     * @param {number} time
     * @param {string} gpx
     * @constructor
     */
    let Track = function(owner, name, time, gpx) {
        let that = this;
        let xml = new DOMParser().parseFromString(gpx, "text/xml");
        let isPublic = false;
        let shares = [];
        that.getName = function() { return name; };
        that.getOwner = function() { return owner; };
        that.getTime = function() { return time * 1000; };
        that.getShares = function() { return shares; };
        that.getXml = function() { return xml; };
        that.getId = function() { return that.getName() + "_" + that.getOwner(); };
        that.isPublic = function() { return isPublic; };
        that.isOwn = function() { return that.getOwner() === currentUser; };
        that.getGpxString = function() { return new XMLSerializer().serializeToString(that.getXml()); };


        that.setPublic = function(p) { isPublic = p; };
        that.setShares = function(s) { shares = s; };

        /**
         * Checks if the Track has time data.
         * @returns {boolean}
         */
        that.hasTimeData = function() {
            return that.getXml().getElementsByTagName("trk")[0]
                .getElementsByTagName("trkpt")[0].getElementsByTagName("time").length != 0;
        };
        /**
         * Checks if the Track got at least one elevation point.
         * @returns {boolean}
         */
        that.hasElevationData = function() {
            return that.getXml().getElementsByTagName("trk")[0]
                    .getElementsByTagName("trkpt")[0].getElementsByTagName("ele").length != 0;
        };
        /**
         * Returns an array of google.maps.LatLng representing the track.
         * @returns {Array}
         */
        that.getLatLngArray = function() {
            let trackNodes = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt");
            let trackPoints = [];
            for (let i = 0; i < trackNodes.length; i++) {
                trackPoints[i] = new google.maps.LatLng(parseFloat(trackNodes[i].getAttribute("lat")), parseFloat(trackNodes[i].getAttribute("lon")));
            }
            return trackPoints;
        };

        /**
         * Returns a google.maps.LatLng representing the track at the given position.
         * @param i
         * @returns {google.maps.LatLng}
         */
        that.getLatLngAt = function(i) {
            let trackNode = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt")[i];
            return new google.maps.LatLng(parseFloat(trackNode.getAttribute("lat")), parseFloat(trackNode.getAttribute("lon")));
        };

        /**
         * Returns the amount of trkpt in the track.
         * @returns {number}
         */
        that.getLength = function() {
              return that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt").length;
        };

        /**
         * Sets the LatLng at the given position.
         * @param i
         * @param latlng
         */
        that.setLatLngAt = function(i, latlng) {
            console.log("set latlng: " + latlng.lat() + ":" + latlng.lng());
            let trackNodes = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt");
            trackNodes[i].setAttribute("lat", latlng.lat().toString());
            trackNodes[i].setAttribute("lon", latlng.lng().toString());
        };

        /**
         * Inserts a LatLng in the Track, guessing elevation and time.
         * @param i
         * @param latlng
         */
        that.addLatLngAt = function(i, latlng) {
            let trackNodes = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt");
            let newNode = trackNodes[i].cloneNode(true);
            newNode.setAttribute("lat", latlng.lat().toString());
            newNode.setAttribute("lon", latlng.lng().toString());
            if (that.hasTimeData()) {
                let timeMiddle = 0;
                if (i === 0) {
                    timeMiddle = that.getTimeAt(0) - ((that.getTimeAt(1) - that.getTimeAt(0)) / 2);
                } else {
                    timeMiddle = that.getTimeAt(i) - ((that.getTimeAt(i) - that.getTimeAt(i - 1)) / 2);
                }
                newNode.getElementsByTagName("time")[0].textContent = new Date(timeMiddle).toISOString();
            }
            if (that.hasElevationData()) {
                let elevationMiddle = 0;
                if (i === 0) {
                    elevationMiddle = that.getHeightAt(0) - ((that.getHeightAt(1) - that.getHeightAt(0)) / 2);
                } else {
                    elevationMiddle = that.getHeightAt(i) - ((that.getHeightAt(i) - that.getHeightAt(i - 1)) / 2);
                }
                newNode.getElementsByTagName("ele")[0].textContent = elevationMiddle;
            }
            trackNodes[i].parentNode.insertBefore(newNode, trackNodes[i]);
        };

        /**
         * Removes the trkpt at the given position.
         * @param i
         */
        that.removeLatLngAt = function(i) {
            let trackNode = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt")[i];
            trackNode.parentNode.removeChild(trackNode);
        };

        /**
         * Uploads the Track.
         */
        that.uploadGpx = function() {
            LoadingIndicator.startLoading();
            jannes.peters.MyTrack.api.sendApiRequest("update_track", {"name": that.getName(), "gpx": that.getGpxString()}, function(req) {
                console.log(req.responseText);
                $("btnSaveTrackChanges").setAttribute("disabled", "");
                LoadingIndicator.stopLoading();
            }, function (req) {
                showError(req.responseText);
                LoadingIndicator.stopLoading();
            });
        };

        /**
         * Resets all changes in the Track.
         */
        that.resetChanges = function() {
            that.xml = new DOMParser().parseFromString(gpx, "text/xml");
        };

        /**
         * Calculates the length in m.
         * @returns {number}
         */
        that.calculateLength = function() {
            return google.maps.geometry.spherical.computeLength(that.getLatLngArray());
        };

        /**
         * Calculates the average speed over the track.
         * @returns {number} the speed in m/s
         */
        that.calculateAverageSpeed = function() {
            let startTime = new Date(
                that.getXml().getElementsByTagName("trk")[0]
                    .getElementsByTagName("trkpt")[0].getElementsByTagName("time")[0].textContent).getTime();
            let endTime = new Date(
                that.getXml().getElementsByTagName("trk")[0]
                    .getElementsByTagName("trkpt")[that.getLength() - 1].getElementsByTagName("time")[0].textContent).getTime();
            let mLength = that.calculateLength();
            let timeInSeconds = (endTime - startTime) / 1000;
            return mLength / timeInSeconds;
        };

        /**
         * Calculates the average speed form the start to the end.
         * @returns {[number]}
         */
        that.calculateAverageSpeeds = function() {
            let result = [0];
            let sumSpeed = 0;
            for (let i = 1; i < that.getLength(); i++) {
                sumSpeed += that.getSpeedAt(i);
                result[i] = sumSpeed / i;
            }
            return result;
        };

        /**
         * Gets the time at i.
         * @param i
         * @returns {number}
         */
        that.getTimeAt = function(i) {
            let trackTime = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("time")[i];
            return new Date(trackTime.textContent).getTime();
        };

        /**
         * Gets the speed at i. i = 0 -> return 0
         * @param i
         * @returns {number}
         */
        that.getSpeedAt = function(i) {
            if (i === 0) return 0.0;
            let trackTimes = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("time");
            let distanceDiff = google.maps.geometry.spherical.computeDistanceBetween(that.getLatLngAt(i - 1), that.getLatLngAt(i));
            let timeDiff = (new Date(trackTimes[i].textContent).getTime() - new Date(trackTimes[i - 1].textContent).getTime()) / 1000;
            return distanceDiff / timeDiff;
        };

        /**
         * Returns the maximum speed between two way points.
         * @returns {number}
         */
        that.calculateMaximumSpeed = function() {
            let trackTimes = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("time");
            let highestSpeed = 0;
            for (let i = 1; i < trackTimes.length; i++) {
                let speed = that.getSpeedAt(i);
                if (highestSpeed < speed) {
                    highestSpeed = speed;
                }
            }
            return highestSpeed;
        };

        /**
         * Calculates the maximum height.
         * @returns {number}
         */
        that.calculateMaximumHeight = function() {
            let elevations = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("ele");
            let maxHeight = 0;
            for (let i = 0; i < elevations.length; i++) {
                let height = parseFloat(elevations[i].textContent);
                if (maxHeight < height) {
                    maxHeight = height;
                }
            }
            return maxHeight;
        };

        /**
         * Returns the height at position 1.
         * @param i
         * @returns {number|undefined}
         */
        that.getHeightAt = function(i) {
            let trpts = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt");
            let trkptEle = trpts[i].getElementsByTagName("ele");
            if (trkptEle.length > 0) {
                return parseFloat(trkptEle[0].textContent);
            } else {
                return undefined;
            }
        };

        /**
         * Fills an array with the accumulated heights for analysis.
         * @returns {Array}
         */
        that.calculateAccumulatedHeights = function() {
            let result = [];
            let lastHeight = undefined;
            let i = 0;
            for (;lastHeight === undefined && i < that.getLength();i++) {
                result[i] = 0;
                lastHeight = that.getHeightAt(i);
            }
            let accHeight = 0;
            for (; i < that.getLength(); i++) {
                let currHeight = that.getHeightAt(i);
                if (currHeight !== undefined && lastHeight < currHeight) {
                    accHeight += currHeight - lastHeight;
                }
                result[i] = accHeight;
                if (currHeight !== undefined) {
                    lastHeight = currHeight;
                }
            }
            return result;
        };

        /**
         * Calculates the accumulated height.
         * @returns {number}
         */
        that.calculateAccumulatedHeight = function() {
            let elevations = that.getXml().getElementsByTagName("trk")[0].getElementsByTagName("ele");
            let height = 0;
            let lastHeight = parseFloat(elevations[0].textContent);
            for (let i = 1; i < elevations.length; i++) {
                let currHeight = parseFloat(elevations[i].textContent);
                if (lastHeight < currHeight) {
                    height += currHeight - lastHeight;
                }
                lastHeight = currHeight;
            }
            return height;
        };
    };
    /**
     * Creates a new Track with an object from server data.
     * @param serverData JSON parse from a server response
     * @returns {Track}
     */
    Track.fromServerData = function(serverData) {
        //noinspection JSUnresolvedVariable
        let track = new Track(serverData.owner, serverData.name, serverData.time, serverData.gpx);
        //noinspection JSUnresolvedVariable
        if (serverData.sharedWith != undefined) { //noinspection JSUnresolvedVariable
            track.setShares(serverData.sharedWith);
        }
        if (serverData.isPublic != undefined) track.setPublic(serverData.isPublic);
        return track;
    };

    /**
     * Holds multiple tracks.
     * @param tracks
     * @constructor
     */
    let TrackList = function(tracks) {
        let that = this;
        that.getTracks = function() { return tracks; };
        /**
         *
         * @param i
         * @returns {Track}
         */
        that.get = function(i) { return tracks[i]; };
        that.sortBySelected = function() {
            let select = $("selectSortOrderTracks");
            that.sortBy(select.options[select.selectedIndex].value);
        };

        that.sortBy = function(mode) {
            tracks.sort(getTrackSortingComparer(mode));
        };

        function getTrackSortingComparer(mode) {
            switch(mode) {
                case "time":
                    return function(a, b) {
                        return a.getTime() - b.getTime();
                    };
                    break;
                case "alphabetical":
                    return function(a, b) {
                        let nameA = a.getName().toUpperCase(); // ignore upper and lowercase
                        let nameB = b.getName().toUpperCase(); // ignore upper and lowercase
                        if (nameA < nameB) {
                            return -1;
                        }
                        if (nameA > nameB) {
                            return 1;
                        }
                        //names equal so sort after the first letters capitalization
                        if (nameA.charAt(0) === a.getName().charAt(0)) {
                            return -1;
                        } else {
                            return +1;
                        }
                    };
                    break;
            }
        }

        that.getLength = function () {
            return tracks.length;
        }
    };
    /**
     * Parses a TrackList from server data.
     * @param serverData JSON parsed server answer.
     * @returns {TrackList}
     */
    TrackList.fromServerData = function(serverData) {
        let trackList = [];
        for (let i = 0; i < serverData.length; i++) {
            trackList[i] = Track.fromServerData(serverData[i]);
        }
        return new TrackList(trackList);
    };

    /**
     * Helper class for diagrams.
     */
    let DIAGRAM_HELPER = new function () {
        let handlers = [];

        /**
         * Reloads all diagrams.
         * Creates data sets for diagrams and sets up handlers for marking and so on.
         */
        this.reloadAll = function() {
            for (let i = 0; i < handlers.length; i++) handlers[i].remove();
            handlers = [];
            let hasTimeData = currentTrack.hasTimeData();
            let xScale = [];
            if (!hasTimeData) {
                showError("No time data available!");
                xScale = createFilledArray(currentTrack.getXml().getElementsByTagName("trk")[0].getElementsByTagName("trkpt").length);
                $('canvasSpeedContainer').addClass("hidden");
                $('canvasAvrgSpeedContainer').addClass("hidden");
            } else {
                let xScaleElements = currentTrack.getXml().getElementsByTagName("trk")[0].getElementsByTagName("time");
                let minTime = new Date(xScaleElements[0].textContent).getTime();
                for (let i = 0; i < xScaleElements.length; i++) {
                    xScale[i] = new Date(xScaleElements[i].textContent).getTime() - minTime;
                }
                $('canvasSpeedContainer').removeClass("hidden");
                $('canvasAvrgSpeedContainer').removeClass("hidden");
                let speedData = [];
                for (let i = 0; i < currentTrack.getLength(); i++) {
                    speedData[i] = Math.metersPerSecondToKilometersPerHour(currentTrack.getSpeedAt(i));
                }
                handlers.push(new DiagramHandler($("canvasSpeed"), speedData, xScale, "(km/h)"));
                handlers[handlers.length - 1].setMarkedHandler(function (start, end, data) {
                    if (start !== -1 && end !== -1 && start !== end) {
                        let sum = 0;
                        for (let i = start; i <= end; i++) {
                            sum += data[i].data;
                        }
                        let avrg = sum / (end - start + 1);
                        $('selectedAvrgSpeedText').setContentText(Math.roundPrecision(avrg, 2).toString());
                    } else {
                        $('selectedAvrgSpeedText').setContentText("0");
                    }
                });

                let avrgSpeedData = currentTrack.calculateAverageSpeeds();
                for (let i = 0; i < avrgSpeedData.length; i++) {
                    avrgSpeedData[i] = Math.metersPerSecondToKilometersPerHour(avrgSpeedData[i]);
                }
                handlers.push(new DiagramHandler($("canvasAvrgSpeed"), avrgSpeedData, xScale, "(km/h)"));
            }
            let heightData = [];
            for (let i = 0; i < currentTrack.getLength(); i++) {
                heightData[i] = currentTrack.getHeightAt(i);
            }
            handlers.push(new DiagramHandler($("canvasHeight"), heightData, xScale, "(m)", "Time"));

            let accHeightData = currentTrack.calculateAccumulatedHeights();
            handlers.push(new DiagramHandler($("canvasAccHeight"), accHeightData, xScale, "(m)"));
            handlers[handlers.length - 1].setMarkedHandler(function (start, end, data) {
                if (start !== -1 && end !== -1) {
                    $('selectedAccHeightText').setContentText(Math.roundPrecision(data[end].data - data[start].data, 2).toString());
                } else {
                    $('selectedAccHeightText').setContentText("0");
                }
            });

            let covTrackData = [0];
            let latLngDat = currentTrack.getLatLngArray();
            for (let i = 1; i < latLngDat.length; i++) {
                covTrackData[i] = covTrackData[i - 1] + google.maps.geometry.spherical.computeDistanceBetween(latLngDat[i - 1], latLngDat[i]);
            }
            handlers.push(new DiagramHandler($("canvasCoveredTrack"), covTrackData, xScale, "(m)"));
            handlers[handlers.length - 1].setMarkedHandler(function (start, end, data) {
                if (start !== -1 && end !== -1) {
                    $('selectedCoveredTrackText').setContentText(Math.roundPrecision((data[end].data - data[start].data) / 1000, 2).toString());
                } else {
                    $('selectedCoveredTrackText').setContentText("0");
                }
            });

            for (let i = 0; i < handlers.length; i++) handlers[i].draw();

            function createFilledArray(length) {
                let arr = [];
                for (let i = 0; i < length; i++) { arr[i] = i; }
                return arr;
            }
        };

        /**
         * Handler that provides drawing and marking listeners for diagrams.
         * @param canvas
         * @param yData
         * @param xValues starting with 0, rising
         * @param yName
         * @constructor
         */
        let DiagramHandler = function(canvas, yData, xValues, yName) {
            let that = this;
            let g = canvas.getContext("2d");
            if (yData.length != xValues.length) showError("The input arrays need to be the same size or the diagram will be wrong! Element: " + canvas.id);
            let redrawListener = function() { that.draw(); };
            let dataPoints = [];
            let markedHandler = null;
            /**
             * Draws the diagram onto the canvas.
             * @param clear if the canvas should be cleared before drawing
             */
            this.draw = function(clear = true) {
                if (clear) that.clear();
                g = canvas.getContext("2d");
                let xScale = g.canvas.width / xValues[xValues.length - 1];
                let yMax = Math.fuzzyMax(...yData);
                let yScale = g.canvas.height / (yMax * 1.1);
                let maxIndex = Math.min(yData.length, xValues.length);
                let lastPos = null;
                g.beginPath();
                g.strokeStyle = "#000000";
                for (let i = 0; i < maxIndex; i++) {
                    if (yData[i] !== undefined) {
                        dataPoints[dataPoints.length] = { "x": xValues[i] * xScale, "data": yData[i] };
                        let xPos = dataPoints[dataPoints.length - 1].x;
                        let yPos = g.canvas.height - (yData[i] * yScale);
                        g.moveTo(xPos, yPos);
                        if (lastPos != null) {
                            g.lineTo(lastPos.x, lastPos.y);
                        }
                        lastPos = {"x": xPos, "y": yPos};
                    }
                }
                g.stroke();

                g.font = "10px Times New Roman";
                g.beginPath();
                g.strokeStyle = "#AAAAAA";
                //noinspection JSUnresolvedFunction
                g.setLineDash([2, 2]);
                g.moveTo(0, g.canvas.height - (yMax * yScale));
                g.lineTo(g.canvas.width, g.canvas.height - (yMax * yScale));
                g.stroke();
                g.beginPath();
                //noinspection JSUnresolvedFunction
                g.setLineDash([]);
                let maxVal = Math.roundPrecision(yMax, 2).toString();
                g.strokeText(maxVal, g.canvas.width - g.measureText(maxVal).width, g.canvas.height - (yMax * yScale) - 5);
                g.beginPath();
                g.strokeText("0", g.canvas.width - g.measureText("0").width, g.canvas.height - 5);

                g.font = "10px Arial";
                g.fillStyle = "#000000";
                g.fillText(yName, 0, 10);
            };
            /**
             * Clears the canvas.
             */
            this.clear = function() {
                canvas.getContext("2d").clearRect(0, 0, g.canvas.width, g.canvas.height);
            };
            /**
             * Removes the Handler from the canvas and clears it.
             */
            this.remove = function() {
                window.removeEventListener("resize", redrawListener);
                that.clear();
            };
            /**
             * Sets a handler which should be called if the marking changed.
             * @param e
             */
            this.setMarkedHandler = function(e) {
                  markedHandler = e;
            };
            /**
             * Sets up all the marking logic.
             */
            function setupMarking() {
                let mouseDown = false;
                let start = 0;
                let pos2 = 0;
                function getClosestDataPoint(x) {
                    let closestIndex = 0;
                    let lastDistance = Number.MAX_VALUE;
                    let distance = 0;
                    for (let i = 0; i < dataPoints.length; i++) {
                        distance = Math.abs(x - dataPoints[i].x);
                        if (distance < lastDistance) {
                            closestIndex = i;
                        } else {
                            break;
                        }
                        lastDistance = distance;
                    }
                    return closestIndex;
                }
                function drawSelection() {
                    g.fillStyle = "rgba(0, 150, 255, 0.5)";
                    that.clear();
                    g.beginPath();
                    g.fillRect(dataPoints[start].x, 0, dataPoints[pos2].x - dataPoints[start].x, g.canvas.height);
                    that.draw(false);
                }
                canvas.addEventListener("mousedown", function(e) {
                    if (markedHandler != null && (e.button === 0 || e.button === 1)) {
                        let mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left;
                        e.preventDefault();
                        start = getClosestDataPoint(mouseX);
                        mouseDown = true;
                        pos2 = getClosestDataPoint(mouseX);
                        drawSelection();
                        markedHandler(Math.min(start, pos2), Math.max(start, pos2), dataPoints);
                    }
                });
                canvas.addEventListener("mouseup", function(e) {
                    if (markedHandler != null && (e.button === 0 || e.button === 1)) {
                        let mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left;
                        e.preventDefault();
                        mouseDown = false;
                        pos2 = getClosestDataPoint(mouseX);
                        if (start === pos2) {
                            that.draw();
                            markedHandler(-1, -1, null);
                        } else {
                            drawSelection();
                            markedHandler(Math.min(start, pos2), Math.max(start, pos2), dataPoints);
                        }
                    }
                });
                canvas.addEventListener("mousemove", function(e) {
                    if (markedHandler != null) {
                        if (mouseDown) {
                            let mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left;
                            pos2 = getClosestDataPoint(mouseX);
                            drawSelection();
                            markedHandler(Math.min(start, pos2), Math.max(start, pos2), dataPoints);
                        }
                    }
                });
                window.addEventListener("resize", function() {
                    if (markedHandler != null) markedHandler(-1, -1, null);
                });
                canvas.addEventListener("mouseleave", function() {
                    mouseDown = false;
                });
            }
            setupMarking();
            that.draw();
            window.addEventListener("resize", redrawListener);
        };
    }();

    /**
     * Sets up all event listeners for the UI.
     */
    function setupEventListeners() {
        $("btnTrackUploadUpload").addEventListener("click", function() {
            let formData = new FormData($("trackUploadForm"));
            LoadingIndicator.startLoading();
            jannes.peters.MyTrack.api.sendApiRequestWithFormData("upload_track", formData, function(req) {
                console.log("Track upload successful! Refreshing tracks ...");
                document.getElementById("closeTrackUpload").click();
                $("trackUploadName").value = "";
                loadOwnTracks();
                LoadingIndicator.stopLoading();
            }, function(req) {
                showError("Error uploading gpx!");
                LoadingIndicator.stopLoading();
            });
        });
        $("btnTrackDelete").addEventListener("click", function() {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                let res = confirm("Do you really want to delete the track? Data cannot be restored!");
                if (res) {
                    jannes.peters.MyTrack.api.sendApiRequest("delete_track", {"name": currentTrack.getName()}, function (req) {
                        console.log(req.responseText);
                        currentTrack = null;
                        reloadUI();
                    }, function (req) {
                        showError(req.status + ": " + req.responseText);
                    });
                }
            }
        });
        $("btnTrackRename").addEventListener("click", function() {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                jannes.peters.MyTrack.api.sendApiRequest("rename_track", {
                    "name": currentTrack.getName(),
                    "newName": $("trackRename").value
                }, function (req) {
                    console.log(req.responseText);
                    $("trackRename").value = "";
                    reloadUI();
                }, function (req) {
                    showError(req.status + ": " + req.responseText);
                });
            }
        });
        $("checkBoxTrackPublic").addEventListener("change", function(e) {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                let type = $("checkBoxTrackPublic").checked ? "make_track_public" : "make_track_private";
                LoadingIndicator.startLoading();
                jannes.peters.MyTrack.api.sendApiRequest(type, { "name": currentTrack.getName() }, function (req) {
                    console.log(req.responseText);
                    LoadingIndicator.stopLoading();
                }, function (req) {
                    showError(req.responseText);
                    LoadingIndicator.stopLoading();
                });
            }
        });
        $("btnTrackRemoveShare").addEventListener("click", function(e) {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                let select = $("selectSharedWith");
                let selectedUser = select.options[select.selectedIndex].value;
                LoadingIndicator.startLoading();
                jannes.peters.MyTrack.api.sendApiRequest("remove_share", { "name": currentTrack.getName(), "shareWith": selectedUser }, function(req) {
                    LoadingIndicator.stopLoading();
                    reloadUI();
                }, function (req) {
                    LoadingIndicator.stopLoading();
                    showError(req.responseText);
                });
            }
        });
        $("btnTrackAddShare").addEventListener("click", function() {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                LoadingIndicator.startLoading();
                jannes.peters.MyTrack.api.sendApiRequest("share_track", {
                    "name": currentTrack.getName(),
                    "shareWith": $("inputShareWith").value
                }, function (req) {
                    LoadingIndicator.stopLoading();
                    console.log(req.responseText);
                    $("inputShareWith").value = "";
                    currentTrack.getShares().push(currentTrack.getName());
                    refreshUI();
                }, function (req) {
                    LoadingIndicator.stopLoading();
                    showError(req.responseText);
                });
            }
        });
        $("selectSortOrderTracks").addEventListener("change", function(e) {
            trackList.sortBy(e.target.options[e.target.selectedIndex].value);
            reloadUI();
        });
        $("btnSaveTrackChanges").addEventListener("click", function() {
            if (currentTrack == null) {
                showError("No track selected!");
            } else {
                currentTrack.uploadGpx();
            }
        });
        $("btnDownloadGpx").addEventListener("click", function() {
            let data = {"name": currentTrack.getName()};
            if (!currentTrack.isOwn()) {
                data.owner = currentTrack.getOwner();
            }
            jannes.peters.MyTrack.api.sendApiFormSubmit("download_gpx", data);
        });
        $("btnDeleteAccount").addEventListener("click", function() {
            let res = confirm("Are you really sure? THIS CANNOT BE UNDONE!");
            if (res) {
                jannes.peters.MyTrack.api.sendApiRequest("delete_account", null, function() {
                    window.location.reload(true);
                }, function (req) {
                    showError(req.responseText);
                });
            }
        });
    }

    /**
     * Creates an anchor element for the track lists.
     * @param track
     * @returns {Element}
     */
    function createTrackListItem(track) {
        let element = document.createElementWithText("a", track.getName());
        element.addClass("list-group-item");
        element.href = "#";
        element.addEventListener("click", (function(that, currTrack) {
            return function(e) {
                LoadingIndicator.startLoading();
                currentTrack = currTrack;
                removeActiveMarkFromTrackLists();
                that.addClass("active");
                refreshUI();
                LoadingIndicator.stopLoading();
            }
        })(element, track));
        return element;
    }

    function removeActiveMarkFromTrackLists() {
        let others = $("ownTracksList").childNodes;
        for (let i = 0; i < others.length; i++) {
            others[i].removeClass("active");
        }
        others = $("sharedTracksList").childNodes;
        for (let i = 0; i < others.length; i++) {
            others[i].removeClass("active");
        }
        others = $("publicTracksList").childNodes;
        for (let i = 0; i < others.length; i++) {
            others[i].removeClass("active");
        }
    }

    function addTrackToList(parent, track) {
        parent.appendChild(createTrackListItem(track));
    }

    function loadOwnTracks() {
        LoadingIndicator.startLoading();
        jannes.peters.MyTrack.api.sendApiRequest("request_own_tracks", null, function(req) {
            let tracks = JSON.parse(req.responseText);
            trackList = TrackList.fromServerData(tracks);
            trackList.sortBySelected();
            let fragment = document.createDocumentFragment();
            for (let i = 0; i < tracks.length; i++) {
                addTrackToList(fragment, trackList.get(i));
            }
            let parent = $("ownTracksList");
            parent.clear();
            parent.appendChild(fragment);
            LoadingIndicator.stopLoading();
        }, function(req) {
            $("ownTracksList").clear();
            $("options").addClass("invisible");
            showError("Error requesting own tracks!\n" + req.status + ":" + req.responseText);
            LoadingIndicator.stopLoading();
        });
    }

    function loadSharedTracks() {
        LoadingIndicator.startLoading();
        jannes.peters.MyTrack.api.sendApiRequest("request_shared_tracks", null, function(req) {
            let tracks = JSON.parse(req.responseText);
            trackListShared = TrackList.fromServerData(tracks);
            trackListShared.sortBySelected();
            let fragment = document.createDocumentFragment();
            for (let i = 0; i < tracks.length; i++) {
                addTrackToList(fragment, trackListShared.get(i));
            }
            let parent = $("sharedTracksList");
            parent.clear();
            parent.appendChild(fragment);
            LoadingIndicator.stopLoading();
        }, function(req) {
            $("sharedTracksList").clear();
            $("options").addClass("invisible");
            showError("Error requesting own tracks!\n" + req.status + ":" + req.responseText);
            LoadingIndicator.stopLoading();
        });
    }

    function loadPublicTracks() {
        LoadingIndicator.startLoading();
        jannes.peters.MyTrack.api.sendApiRequest("request_public_tracks", null, function(req) {
            let tracks = JSON.parse(req.responseText);
            trackListPublic = TrackList.fromServerData(tracks);
            trackListPublic.sortBySelected();
            let fragment = document.createDocumentFragment();
            for (let i = 0; i < tracks.length; i++) {
                addTrackToList(fragment, trackListPublic.get(i));
            }
            let parent = $("publicTracksList");
            parent.clear();
            parent.appendChild(fragment);
            LoadingIndicator.stopLoading();
        }, function(req) {
            $("publicTracksList").clear();
            $("options").addClass("invisible");
            showError("Error requesting own tracks!\n" + req.status + ":" + req.responseText);
            LoadingIndicator.stopLoading();
        });
    }

    setupEventListeners();
    reloadUI();
});