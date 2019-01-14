<?php

/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 13:07
 */
declare(strict_types=1);

require_once dirname(__FILE__)."/../Util.php";

class User
{
    private $name;
    private $password;

    /**
     * User constructor. Represents a user in the database.
     * @param string $name
     * @param string $password
     */
    public function __construct(string $name, string $password)
    {
        $this->name = $name;
        $this->password = $password;
    }

    /**
     * Checks if the user exists.
     * @return bool
     */
    public function nameExists() : bool {
        return Util::redis()->sIsMember('users', $this->name);
    }

    private function getKey() : string {
        return "user_" . $this->name;
    }

    /**
     * Checks if the user is a valid combination of useranme and password.
     * @return bool
     */
    public function isValid() : bool {
        $isValid = $this->nameExists();
        if ($isValid) {
            $isValid = Util::redis()->hGet($this->getKey(), 'password') == $this->password;
        }
        return $isValid;
    }

    /**
     * Creates the user.
     * @throws Exception if the username is already taken
     */
    public function register() {
        if ($this->nameExists()) {
            throw new Exception("The username is already taken!");
        } else {
            Util::redis()->sAdd('users', $this->name);
            Util::redis()->hMset($this->getKey(), array(
                'name' => $this->name,
                'password' => $this->password,
                'tracks' => 'userTracks_' . $this->name,
                'receivedShares' => 'receivedShares_' . $this->name
            ));
        }
    }

    public function getName() : string {
        return $this->name;
    }

    /**
     * Registers the given track reference.
     * @param Track $track
     */
    public function registerTrack(Track $track) {
        $trackKey = Util::redis()->hGet($this->getKey(), "tracks");
        Util::redis()->sAdd($trackKey, $track->getKey());
    }

    /**
     * Removes the track reference from the user.
     * @param Track $track
     */
    public function removeTrack(Track $track) {
        $trackKey = Util::redis()->hGet($this->getKey(), "tracks");
        Util::redis()->sRem($trackKey, $track->getKey());
    }

    /**
     * Remove shared track reference form the user.
     * @param Track $track
     */
    public function removeReceivedShare(Track $track) {
        $receivedShares = Util::redis()->hGet($this->getKey(), 'receivedShares');
        Util::redis()->sRem($receivedShares, $track->getKey());
    }

    /**
     * Registers shared track as a reference in the user.
     * @param Track $track
     */
    public function registerReceivedShare(Track $track) {
        $receivedShares = Util::redis()->hGet($this->getKey(), 'receivedShares');
        Util::redis()->sAdd($receivedShares, $track->getKey());
    }

    /**
     * Get the list of own tracks.
     * @return array
     */
    public function getTracks() : array {
        $trackListName =  Util::redis()->hGet($this->getKey(), 'tracks');
        $trackList = Util::redis()->sMembers($trackListName);
        $tracks = array();
        for ($i = 0; $i < count($trackList); $i++) {
            $tracks[$i] = Track::fromKey($trackList[$i]);
        }
        return $tracks;
    }

    /**
     * Get the list of shared (with this user) tracks.
     * @return array
     */
    public function getSharedTracks() : array {
        $trackListName =  Util::redis()->hGet($this->getKey(), 'receivedShares');
        $trackList = Util::redis()->sMembers($trackListName);
        $tracks = array();
        for ($i = 0; $i < count($trackList); $i++) {
            $tracks[$i] = Track::fromKey($trackList[$i]);
        }
        return $tracks;
    }

    /**
     * Get the track with the given name.
     * @param string $name
     * @return Track
     * @throws Exception if the track name doesn't exist
     */
    public function getTrack(string $name) : Track {
        $tracks = $this->getTracks();
        for ($i = 0; $i < count($tracks); $i++) {
            if ($tracks[$i]->getName() === $name) {
                return $tracks[$i];
            }
        }
        throw new Exception("No track with the given name: " . $name . " found!");
    }

    /**
     * Get the track with the given name.
     * @param string $owner
     * @param string $name
     * @return Track
     * @throws Exception if the track name doesn't exist
     */
    public function getSharedTrack(string $owner, string $name) : Track {
        $tracks = $this->getSharedTracks();
        for ($i = 0; $i < count($tracks); $i++) {
            if ($tracks[$i]->getName() === $name && $tracks[$i]->getOwner() === $owner) {
                return $tracks[$i];
            }
        }
        throw new Exception("No track with the given name: " . $name . " found!");
    }

    /**
     * Deletes the user, including all the data and tracks.
     */
    public function delete() {
        $tracks = $this->getTracks();
        foreach ($tracks as $track) {
            $track->delete();
        }
        Util::redis()->sRem("users", $this->getName());
        Util::redis()->del($this->getKey());
    }
}