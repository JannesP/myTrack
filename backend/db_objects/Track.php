<?php

/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 26.11.2016
 * Time: 21:05
 */
class Track
{
    private $owner;
    private $name;
    private $gpx;
    private $sharedWith;
    private $isPublic;

    /**
     * Track constructor. To save any changes Track->save() needs to be called!
     * @param string $owner
     * @param string $name
     * @param string $gpx
     * @param array $sharedWith
     */
    public function __construct(string $owner, string $name, string $gpx, $sharedWith = array()) {
        $this->owner = $owner;
        $this->name = $name;
        $this->gpx = $gpx;
        $this->sharedWith = $sharedWith;
        $this->isPublic = false;
    }

    public function getKey() : string {
        return "track_" . $this->owner . "_" . $this->name;
    }

    /**
     * Creates a Track object from a database key.
     * @param string $key
     * @return Track
     */
    public static function fromKey(string $key) : Track {
        $vars = Util::redis()->hMGet($key, array('owner', 'name', 'gpx', 'sharedWith'));
        return new Track($vars['owner'], $vars['name'], $vars['gpx'], Util::redis()->sMembers($vars['sharedWith']));
    }

    /**
     * Saves the current Track object state back to the database.
     */
    public function save() {
        Util::redis()->hMset($this->getKey(), array(
            'owner' => $this->owner,
            'name' => $this->name,
            'gpx' => $this->writeNameToGpx($this->name),
            'sharedWith' => "trackShares_" . $this->getKey(),
            'isPublic' => $this->isPublic
        ));
        Util::redis()->del("trackShares_" . $this->getKey());
        Util::redis()->sAddArray("trackShares_" . $this->getKey(), $this->sharedWith);
        for ($i = 0; $i < count($this->sharedWith); $i++) {
            $user = new User($this->sharedWith[$i], "");
            if ($user->nameExists()) {
                $user->registerReceivedShare($this);
            }
        }
        if ($this->isPublic) {
            Util::redis()->sAdd("public_tracks", $this->getKey());
        } else {
            Util::redis()->sRem("public_tracks", $this->getKey());
        }
        UserSession::getCurrent()->getUser()->registerTrack($this);
    }

    /**
     * @param string $name
     * @return string the new, changed gpx string
     */
    public function writeNameToGpx(string $name) : string {
        $xml = new DOMDocument();
        $xml->loadXML($this->gpx);
        $track = $xml->getElementsByTagName("trk")->item(0);
        $nameElement = $track->getElementsByTagName("name")->item(0);
        $nameElement->nodeValue = $name;
        return $xml->saveXML();
    }

    /**
     * @return int unix timestamp
     */
    public function getTime() : int {
        $gpxText = Util::redis()->hGet($this->getKey(), 'gpx');
        $xml = new DOMDocument();
        $xml->loadXML($gpxText);
        $metaData = $xml->getElementsByTagName("metadata")->item(0);
        $metaDataTimeList = $metaData->getElementsByTagName("time");
        if ($metaDataTimeList->length <= 0) {
            return -1;
        }
        $xsdDateTime = $metaDataTimeList->item(0)->nodeValue;
        $time = strtotime($xsdDateTime);
        if ($time === false) {
            return -1;
        } else {
            return $time;
        }

    }

    /**
     * Shares the Track with another user.
     * @param string $username
     * @return bool true on success
     */
    public function shareWith(string $username) : bool {
        $user = new User($username, "");
        if ($user->nameExists()) {
            $user->registerReceivedShare($this);
            array_push($this->sharedWith, $user->getName());
            return true;
        }
        return false;
    }

    /**
     * Removes a share that exists.
     * @param string $username
     * @return bool true on success
     */
    public function removeShare(string $username) : bool {
        $user = new User($username, "");
        if ($user->nameExists()) {
            $user->removeReceivedShare($this);
        }
        $this->sharedWith = Util::array_remove_value($this->sharedWith, $username);
        return true;
    }

    /**
     * Deletes the Track, including all shares and other connected data.
     */
    public function delete() {
        Util::redis()->sRem("public_tracks", $this->getKey());
        Util::redis()->del($this->getKey());
        Util::redis()->del("trackShares_" . $this->getKey());
        UserSession::getCurrent()->getUser()->removeTrack($this);
        for ($i = 0; $i < count($this->sharedWith); $i++) {
            $user = new User($this->sharedWith[$i], "");
            if ($user->nameExists()) {
                $user->removeReceivedShare($this);
            }
        }
    }

    /**
     * Checks if the track name is free.
     * @param string $name
     * @return bool
     */
    public static function isOwnTrackNameFree(string $name) : bool {
        $tracks = UserSession::getCurrent()->getUser()->getTracks();
        for ($i = 0; $i < count($tracks); $i++) {
            if ($tracks[$i] === $name) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if the gpx fits the gpx version 1.1 scheme, declared by: http://www.topografix.com/GPX/1/1/gpx.xsd .
     * @param string $gpx
     * @return bool
     */
    public static function checkGpx(string $gpx) : bool {
        libxml_use_internal_errors();
        $xml = new DOMDocument();
        if ($gpx == "") {
            return false;
        }
        return $xml->loadXML($gpx) && $xml->schemaValidate("http://www.topografix.com/GPX/1/1/gpx.xsd");
    }

    public function setGpx(string $gpx) {
        $this->gpx = $gpx;
    }

    public function makePublic() {
        $this->isPublic = true;
    }

    public function makePrivate() {
        $this->isPublic = false;
    }

    public function isPublic() : bool {
        return Util::redis()->hGet($this->getKey(), 'isPublic');
    }

    public function getGpx() : string {
        return Util::redis()->hGet($this->getKey(), 'gpx');
    }

    public function getName() : string {
        return Util::redis()->hGet($this->getKey(), 'name');
    }

    public function setName(string $name) : string {
        return $this->name = $name;
    }

    public function getOwner() : string {
        return Util::redis()->hGet($this->getKey(), 'owner');
    }

    public function getShares() : array {
        return Util::redis()->sMembers(Util::redis()->hGet($this->getKey(), 'sharedWith'));
    }

    public function exists() : bool {
        return Util::redis()->exists($this->getKey());
    }
}