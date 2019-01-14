<?php

/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 13:45
 */
declare(strict_types=1);

require_once dirname(__FILE__)."/../Util.php";
require_once "User.php";
class UserSession
{
    private $user;
    private $sessionId;

    /**
     * UserSession constructor.
     * @param User $validUser
     * @param string|null $sessionId
     */
    public function __construct(User $validUser, string $sessionId = null)
    {
        $this->user = $validUser;
        if ($sessionId == null) {
            $sessionId = session_id();
        }
        $this->sessionId = $sessionId;
        Util::redis()->set("session_" . $this->sessionId, $this->user->getName());
        //session lifetime of 4 weeks (28 days)
        Util::redis()->expire("session_" . $this->sessionId, 2419200);
    }

    /**
     * Returns the current user session.
     * @return UserSession
     * @throws Exception
     */
    public static function getCurrent() : UserSession {
        if (Util::redis()->exists("session_" . session_id())) {
            //session lifetime of 4 weeks (28 days)
            Util::redis()->expire("session_" . session_id(), 2419200);
            return new UserSession(new User(Util::redis()->get("session_" . session_id()), ""), session_id());
        }
        throw new Exception("The given user doesn't exist.");
    }

    /**
     * Checks if there is a UserSession registered for the php session.
     * @return bool
     */
    public static function sessionExists() : bool {
        return Util::redis()->exists("session_" . session_id());
    }

    /**
     * Finishes the session, deleting it and logs the user out.
     */
    public function finish() {
        session_destroy();
        Util::redis()->delete("session_" . $this->sessionId);
        Util::noSessionRedirect();
    }

    /**
     * Get the user of the current session.
     * @return User
     */
    public function getUser() : User {
        return $this->user;
    }
}