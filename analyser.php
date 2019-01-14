<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 27.11.2016
 * Time: 01:59
 */
require_once "backend/Util.php";
require_once "backend/db_objects/UserSession.php";
session_start();
$exception = null;
Util::noSessionRedirect();
$username = UserSession::getCurrent()->getUser()->getName();
?>
<!DOCTYPE html>
<html>
<head>
    <?php require("backend/global_header.php") ?>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB49UjYdzkNaoQJMLbh3jxGIUwc6wXvMTw&libraries=drawing,geometry"
            defer></script>
    <link rel="stylesheet" href="analyser.css" type="text/css">
    <script src="analyser.js"></script>
    <title>Analyser</title>
</head>
<body>
<?php
if ($exception != null) echo ExceptionHeader::include($exception->getMessage());
?>
<?php require "backend/loading.html" ?>
<nav class="navbar navbar-default">
    <div class="container-fluid">
        <div class="navbar-header">
            <a class="navbar-brand" href="#">myTrack</a>
        </div>
        <ul class="nav navbar-nav">
            <li><a href="recorder.php">Recorder</a></li>
        </ul>
        <div class="right">
            Logged in as: <strong id="username"><?php echo $username ?></strong>
            <form action="login.php" method="post" title="logout">
                <button class="btn btn-default" type="button" data-toggle="modal" data-target="#modalUserSettings">Options</button>
                <button class="btn btn-default" type="submit" name="action" value="logout">Logout</button>
            </form>
        </div>
    </div>
</nav>
<div class="row">
    <div id="tracks" class="col-sm-3">
        <div class="form-group">
            <label for="selectSortOrderTracks">Sort tracks by:</label>
            <select class="form-control" id="selectSortOrderTracks">
                <option value="alphabetical">0-9, A-Z</option>
                <option value="time">Time</option>
            </select>
        </div>
        <div class="panel-group">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h4 class="panel-title">
                        <a data-toggle="collapse" href="#ownTracksCollapse">Own Tracks</a>
                    </h4>
                </div>
                <div id="ownTracksCollapse" class="panel-collapse collapse in">
                    <div id="ownTracksList" class="list-group"></div>
                    <div class="panel-footer"><button id="btnUploadTrack" type="button" class="btn btn-success btn-block" data-toggle="modal" data-target="#modalTrackUpload">Upload new</button></div>
                </div>
            </div>
        </div>
        <div class="panel-group">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h4 class="panel-title">
                        <a data-toggle="collapse" href="#sharedTracksCollapse">Shared with you</a>
                    </h4>
                </div>
                <div id="sharedTracksCollapse" class="panel-collapse collapse">
                    <div id="sharedTracksList" class="list-group"></div>
                </div>
            </div>
        </div>
        <div class="panel-group">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h4 class="panel-title">
                        <a data-toggle="collapse" href="#publicTracksCollapse">Public Tracks</a>
                    </h4>
                </div>
                <div id="publicTracksCollapse" class="panel-collapse collapse">
                    <div id="publicTracksList" class="list-group"></div>
                </div>
            </div>
        </div>
    </div>

    <div id="content" class="col-sm-6">
        <h4>Track metrics:</h4>
        <p>Track Name: <strong id="trackName">name</strong></p>
        <p>Owner: <strong id="trackOwner">owner</strong></p>
        <p>Date created: <strong id="trackDate">date</strong></p>
        <p>Length (km): <strong id="trackLength">length</strong></p>
        <p>Average Speed (km/h): <strong id="trackAvrgSpeed">speed</strong></p>
        <p>Maximum Speed (km/h): <strong id="trackMaxSpeed">maximum speed</strong></p>
        <p>Accumulated Height (m): <strong id="trackAccHeight">accumulated height</strong></p>
        <p>Maximum Height (m): <strong id="trackMaxHeight">maximum height</strong></p>

        <div id="google-map"></div>

        <div id="canvasSpeedContainer" class="row">
            <div class="col-sm-12">
                <h4>Speed</h4>
                <div class="diagram">
                    <canvas id="canvasSpeed"></canvas>
                </div>
                <p id="selectedAvrgSpeed">Selected Average Speed: <strong id="selectedAvrgSpeedText">0</strong> km/h</p>
            </div>
        </div>
        <div id="canvasAvrgSpeedContainer" class="row">
            <div class="col-sm-12">
                <h4>Average Speed</h4>
                <div class="diagram">
                    <canvas id="canvasAvrgSpeed"></canvas>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-12">
                <h4>Height</h4>
                <div class="diagram">
                    <canvas id="canvasHeight"></canvas>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-12">
                <h4>Accumulated Height</h4>
                <div class="diagram">
                    <canvas id="canvasAccHeight"></canvas>
                </div>
                <p id="selectedAccHeight">Selected Accumulated Height: <strong id="selectedAccHeightText">0</strong> m</p>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-12">
                <h4>Covered Track</h4>
                <div class="diagram">
                    <canvas id="canvasCoveredTrack"></canvas>
                </div>
                <p id="selectedCoveredTrack">Selected Covered Track: <strong id="selectedCoveredTrackText">0</strong> km</p>
            </div>
        </div>

        <button id="btnDownloadGpx" type="button" class="btn btn-block btn-success">Download Gpx</button>
    </div>

    <div id="options" class="col-sm-3 invisible">
        <h4>Track settings:</h4>
        <button id="btnSaveTrackChanges" type="button" class="btn btn-block btn-success">Save Changes</button>
        <form>
            <label for="trackRename">Name:</label>
            <input id="trackRename" name="name" type="text" class="form-control" />
        </form>
        <button id="btnTrackRename" type="button" class="btn btn-block btn-warning">Rename Track</button>
        <div id="sharingOptions" class="form-group">
            <h4>Sharing:</h4>
            <div class="checkbox">
                <label><input id="checkBoxTrackPublic" type="checkbox" value="">Make Public</label>
            </div>
            <label for="selectSharedWith">Shared with:</label>
            <select class="form-control" id="selectSharedWith"></select>
            <button id="btnTrackRemoveShare" type="button" class="btn btn-block btn-warning">Remove Share</button>

            <label for="inputShareWith">Share with:</label>
            <input id="inputShareWith" type="text" class="form-control" />
            <button id="btnTrackAddShare" type="button" class="btn btn-block btn-success">Add Share</button>
        </div>
        <h4>Danger:</h4>
        <button id="btnTrackDelete" type="button" class="btn btn-block btn-danger">Delete Track</button>
    </div>
</div>
<div id="modalTrackUpload" class="modal fade" role="dialog">
    <div class="modal-dialog">
        <!-- Content -->
        <div class="modal-content">
            <div class="modal-header">
                <button id="closeTrackUpload" type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title">Upload Track</h4>
            </div>
            <div class="modal-body">
                <p>To upload a file simply select it, give it a name and hit 'Upload'.</p>
                <form id="trackUploadForm" enctype="multipart/form-data">
                    <input type="hidden" name="MAX_FILE_SIZE" value="8000000" />
                    <label for="trackUploadName">Track name:</label>
                    <input id="trackUploadName" name="name" type="text" class="form-control" />
                    <input id="trackUploadFile" type="file" name="gpx" accept="application/gpx+xml" />
                </form>
                <button id="btnTrackUploadUpload" type="button" class="btn btn-success btn-block">Upload</button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
<div id="modalUserSettings" class="modal fade" role="dialog">
    <div class="modal-dialog">
        <!-- Content -->
        <div class="modal-content">
            <div class="modal-header">
                <button id="closeUserSettings" type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title">Upload Track</h4>
            </div>
            <div class="modal-body">
                <button id="btnDeleteAccount" type="button" class="btn btn-danger btn-block">Delete Account CANNOT BE UNDONE!</button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-warning" data-dismiss="modal">Cancel</button>
            </div>
        </div>
    </div>
</div>
</body>
</html>
