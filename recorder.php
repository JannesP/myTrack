<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 10.12.2016
 * Time: 01:51
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
    <link rel="stylesheet" href="recorder.css" type="text/css">
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB49UjYdzkNaoQJMLbh3jxGIUwc6wXvMTw&libraries=geometry"
            defer></script>
    <script src="recorder.js"></script>
    <title>Recorder</title>
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
            <li><a href="analyser.php">Analyser</a></li>
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

<div id="recorderUI" class="hidden hidableUIElement">
    <div class="row">
        <h4>Current Speed (km/h)</h4>
        <div class="centerTextY">
            <strong class="xTraLarge"><span id="spanSpeed">0</span></strong>
        </div>
    </div>
    <div class="row">
        <h4>Current Height (m)</h4>
        <div class="centerTextY">
            <strong class="xTraLarge"><span id="spanHeight">0</span></strong>
        </div>
    </div>
    <div class="row">
        <h4>Average Speed</h4>
        <div class="centerTextY">
            <strong class="xTraLarge"><span id="spanAvrgSpeed">0</span> km/h</strong>
        </div>
    </div>
    <div class="row">
        <h4>Covered Track</h4>
        <div class="centerTextY">
            <strong class="xTraLarge"><span id="spanCoveredTrack">0</span> km</strong>
        </div>
    </div>

    <div class="row">
        <button id="btnStartPauseRecording" type="button" class="btn btn-success">Start</button>
        <button id="btnStopRecording" type="button" class="btn btn-warning" disabled>Stop</button>
    </div>
</div>

<div id="uploadTrackUI" class="hidden hidableUIElement">
    <div class="row">
        <div class="col-sm-3"></div>
        <div class="col-sm-6">
            <h4>To upload the recorded track, give it a name and hit 'Upload'.</h4>
            <form>
                <div class="form-group">
                    <label for="trackUploadName">Track name:</label>
                    <input id="trackUploadName" name="name" type="text" class="form-control"/>
                </div>
                <button id="btnUploadTrack" type="button" class="btn btn-success form-control">Upload</button>
                <button id="btnSaveTrack" type="button" class="btn btn-success form-control">Save GPX</button>
                <button id="btnDeleteTrack" type="button" class="btn btn-danger form-control">Delete</button>
            </form>
        </div>
        <div class="col-sm-3"></div>
    </div>
</div>

<div id="geolocationWaiterUI" class="hidden hidableUIElement">
    <h4>This browser doesn't support geolocation!</h4>
</div>
</body>
</html>
