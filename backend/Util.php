<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 12:52
 */
declare(strict_types=1);

require_once "db_objects/UserSession.php";
require_once 'C:/RedisDBs/RedisDBs_WS16.php';

final class Util
{
    private static $redis;

    private function __construct() {}

    /**
     * Redirects to the login page if there's no UserSession.
     */
    public static function noSessionRedirect() {
        if (!UserSession::sessionExists()) {
            self::redirect("login.php");
        }
    }

    /**
     * Redirects to the given page.
     * @param string $relativePath
     */
    public static function redirect(string $relativePath) {
        header("location: " . $relativePath);
        exit();
    }

    /**
     * Gets an initialized Redis object to use.
     * @return Redis
     */
    public static function redis() : Redis {
        if (!isset(self::$redis)) {
            self::$redis = new Redis();
            self::$redis->connect('localhost');
            //self::$redis->select(0);
            self::$redis->select(JANNES_PETERS_DB);
            self::$redis->flushDB();
        }
        return self::$redis;
    }

    /**
     * Returns a new array with the given value removed.
     * @param array $arr
     * @param $value
     * @return array
     */
    public static function array_remove_value(array $arr, $value) : array {
        if(($key = array_search($value, $arr)) !== false) {
            unset($arr[$key]);
            return array_values($arr);
        }
        return $arr;
    }
}