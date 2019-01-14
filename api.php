<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 27.11.2016
 * Time: 04:21
 */
require_once "backend/db_objects/UserSession.php";
require_once "backend/db_objects/Track.php";
error_reporting(0);
session_start();
function error(int $code, string $message = "") {
    http_response_code($code);
    header("Content-type: text/plain");
    echo $message;
    exit();
}

function respond(string $httpDataType, string $data) {
    http_response_code(200);
    header("type: " . $httpDataType);
    echo $data;
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    error(405, "Only POST request are allowed!");
} else if (!UserSession::sessionExists()) {
    error(401, "Be sure the user is logged in properly.");
} else if (!isset($_POST['type'])) {
    echo $_POST['type'] . "dabum";
    echo UserSession::getCurrent()->getUser()->getName();
    echo print_r($_POST, true);
    error(400);
} else {
    try {
        switch ($_POST['type']) {
            case "request_own_tracks":
                $tracks = UserSession::getCurrent()->getUser()->getTracks();
                $jsonArray = array();
                for ($i = 0; $i < count($tracks); $i++) {
                    $jsonArray[$i] = array(
                        'name' => $tracks[$i]->getName(),
                        'owner' => $tracks[$i]->getOwner(),
                        'isPublic' => $tracks[$i]->isPublic(),
                        'sharedWith' => $tracks[$i]->getShares(),
                        'gpx' => $tracks[$i]->getGpx(),
                        'time' => $tracks[$i]->getTime()
                    );
                }
                $response = json_encode($jsonArray);
                respond("text/json", $response);
                break;
            case "request_own_full_track":
                if (!isset($_POST['name'])) {
                    error(400, "no data given for request_full_track");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    $jsonObject = array(
                        'name' => $track->getName(),
                        'owner' => $track->getOwner(),
                        'gpx' => $track->getGpx(),
                        'sharedWith' => $track->getShares(),
                        'isPublic' => $track->isPublic(),
                        'time' => $track->getTime()
                    );
                    $response = json_encode($jsonObject);
                    respond("text/json", $response);
                }
                break;
            case "request_shared_tracks":
                $tracks = UserSession::getCurrent()->getUser()->getSharedTracks();
                $jsonArray = array();
                for ($i = 0; $i < count($tracks); $i++) {
                    $jsonArray[$i] = array(
                        'name' => $tracks[$i]->getName(),
                        'owner' => $tracks[$i]->getOwner(),
                        'isPublic' => $tracks[$i]->isPublic(),
                        'gpx' => $tracks[$i]->getGpx(),
                        'time' => $tracks[$i]->getTime()
                    );
                }
                $response = json_encode($jsonArray);
                respond("text/json", $response);
                break;
            case "request_shared_full_track":
                if (!isset($_POST['name']) || !isset($_POST['owner'])) {
                    error(400, "no data given for request_shared_full_track");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getSharedTrack($_POST['owner'], $_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    $jsonObject = array(
                        'name' => $track->getName(),
                        'owner' => $track->getOwner(),
                        'gpx' => $track->getGpx(),
                        'isPublic' => $track->isPublic(),
                        'time' => $track->getTime()
                    );
                    $response = json_encode($jsonObject);
                    respond("text/json", $response);
                }
                break;
            case "request_public_tracks":
                $trackKeys = Util::redis()->sMembers("public_tracks");
                $tracks = array();
                for ($i = 0; $i < count($trackKeys); $i++) {
                    $tracks[$i] = Track::fromKey($trackKeys[$i]);
                }
                $jsonArray = array();
                for ($i = 0; $i < count($tracks); $i++) {
                    $jsonArray[$i] = array(
                        'name' => $tracks[$i]->getName(),
                        'owner' => $tracks[$i]->getOwner(),
                        'isPublic' => $tracks[$i]->isPublic(),
                        'gpx' => $tracks[$i]->getGpx(),
                        'time' => $tracks[$i]->getTime()
                    );
                    if ($jsonArray[$i]['owner'] === UserSession::getCurrent()->getUser()->getName()) {
                        $jsonArray[$i]['sharedWith'] = $tracks[$i]->getShares();
                    }
                }
                $response = json_encode($jsonArray);
                respond("text/json", $response);
                break;
            case "upload_track":
                if (!isset($_FILES['gpx']) || $_FILES['gpx']['tmp_name'] == "" || !isset($_POST['name'])) {
                    print_r($_POST);
                    print_r($_FILES);
                    error(400, "upload_track without proper 'gpx' or 'name'!");
                } else if (!Track::isOwnTrackNameFree($_POST['name'])) {
                    error(400, "The track name is already taken. Track names need to be unique!");
                } else {
                    $gpx = file_get_contents($_FILES['gpx']['tmp_name']);
                    try {
                        if (!Track::checkGpx($gpx)) {
                            error(400, "The uploaded GPX doesn't seem to be valid.");
                        }
                        $track = new Track(UserSession::getCurrent()->getUser()->getName(), $_POST['name'], $gpx);
                        $track->save();
                    } catch (Exception $exception) {
                        error(400, $exception->getMessage());
                    }
                }
                respond(200, "Track uploaded.");
                break;
            case "upload_track_text":
                if (!isset($_POST['gpx']) || !isset($_POST['name'])) {
                    print_r($_POST);
                    print_r($_FILES);
                    error(400, "upload_track without proper 'gpx' or 'name'!");
                } else if (!Track::isOwnTrackNameFree($_POST['name'])) {
                    error(400, "The track name is already taken. Track names need to be unique!");
                } else {
                    $gpx = $_POST['gpx'];
                    try {
                        if (!Track::checkGpx($gpx)) {
                            error(400, "The uploaded GPX doesn't seem to be valid.");
                        }
                        $track = new Track(UserSession::getCurrent()->getUser()->getName(), $_POST['name'], $gpx);
                        $track->save();
                    } catch (Exception $exception) {
                        error(400, $exception->getMessage());
                    }
                }
                Util::redirect("analyser.php");
                break;
            case "delete_track":
                if (!isset($_POST['name'])) {
                    error(400, "delete_track without name!");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    $track->delete();
                    respond("text/plain", "Track successfully deleted.");
                }
                break;
            case "rename_track":
                if (!isset($_POST['name']) || !isset($_POST['newName'])) {
                    error(400, "rename_track without name or newName!");
                } else if (!Track::isOwnTrackNameFree($_POST['newName'])) {
                    error(400, "The trackname is already taken. Trackanmes need to be unique!");
                } else {
                    $track = null;
                    try {
                        $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    } catch (Exception $ex) {
                        error(400, $ex->getMessage());
                    }
                    $track->delete();
                    $track->setName($_POST['newName']);
                    $track->save();
                    respond("text/plain", "Track successfully renamed.");
                }
                break;
            case "update_track":
                if (!isset($_POST['name']) || !isset($_POST['gpx'])) {
                    error(400, "update_track without name or gpx!");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    if (!Track::checkGpx($_POST['gpx'])) error(400, "The gpx wasn't valid!");
                    $track->setGpx($_POST['gpx']);
                    $track->save();
                    respond("text/plain", "Track successfully updated.");
                }
                break;
            case "is_track_name_free":
                if (!isset($_POST['name'])) {
                    error(400, "no 'name' given for is_track_name_free");
                } else {
                    $response = array('isFree' => Track::isOwnTrackNameFree($_POST['name']));
                    respond("text/json", json_encode($response));
                }
                break;
            case "make_track_public":
                if (!isset($_POST['name'])) {
                    error(400, "no 'name' given for make_track_public");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    $track->makePublic();
                    $track->save();
                    respond("text/plain", "Track made public.");
                }
                break;
            case "make_track_private":
                if (!isset($_POST['name'])) {
                    error(400, "no 'name' given for make_track_private");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    $track->makePrivate();
                    $track->save();
                    respond("text/plain", "Track made private.");
                }
                break;
            case "share_track":
                if (!isset($_POST['name']) || !isset($_POST['shareWith'])) {
                    error(400, "no 'name' or 'shareWith' given for share_track");
                } else {
                    $track = null;
                    try {
                        $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    } catch (Exception $ex) {
                        error(400, $ex->getMessage());
                    }
                    if (!$track->shareWith($_POST['shareWith'])) error(400, "Error sharing with " . $_POST['shareWith']);
                    $track->save();
                    respond("text/plain", "Track successfully shared.");
                }
                break;
            case "remove_share":
                if (!isset($_POST['name']) || !isset($_POST['shareWith'])) {
                    error(400, "no 'name' or 'shareWith' given for remove_share");
                } else {
                    $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    if ($track == null) error(400, "No track with the name '" . $_POST['name'] . "' found!");
                    if (!$track->removeShare($_POST['shareWith'])) error(400, "Error removing share with " . $_POST['shareWith']);
                    $track->save();
                    respond("text/plain", "Share successfully removed.");
                }
                break;
            case "download_gpx":
                if (!isset($_POST['name'])) {
                    error(400, "the name is not specified.");
                } else {
                    $track = Track::fromKey("");
                    if (!isset($_POST['owner'])) {
                        $track = UserSession::getCurrent()->getUser()->getTrack($_POST['name']);
                    } else {
                        $track = UserSession::getCurrent()->getUser()->getSharedTrack($_POST['owner'], $_POST['name']);
                    }
                    $gpx = $track->getGpx();
                    header("Content-Type: octet-stream");
                    header("Content-Disposition: attachment; filename=" . $track->getName() . ".gpx");
                    header("Content-Length: " . strlen($track->getGpx()));
                    echo $gpx;
                    exit();
                }
                break;
            case "delete_account":
                $user = UserSession::getCurrent()->getUser();
                $user->delete();
                UserSession::getCurrent()->finish();
                exit();
                break;
            default:
                error(400, "Unknown api call!");
                break;
        }
    } catch (Exception $exception) {
        error(500, $exception->getMessage());
    } finally {
        print_r(error_get_last());
    }

}

