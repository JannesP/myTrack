<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 14:04
 */
declare(strict_types=1);

require_once "backend/Util.php";
require_once "backend/db_objects/UserSession.php";
require_once "backend/ExceptionHeader.php";
session_start();
$exception = null;
if (isset($_POST['action'])) {
    $username = "";
    if ($_POST['action'] == "logout") {
        if (UserSession::sessionExists()) UserSession::getCurrent()->finish();
    } else {
        if (isset($_POST['username'])) {
            $username = trim($_POST['username']);
        }
        $password = "";
        if (isset($_POST['password'])) {
            $password = trim($_POST['password']);
        }
        $user = new User($username, $password);
        if ($_POST['action'] == "login") {
            if ($user->isValid()) {
                new UserSession($user);
            } else {
                $exception = new Exception("The username and password entered aren't a valid combination!");
            }
        } else if ($_POST['action'] == "register") {
            if (strlen($username) < 4) {
                $exception = new Exception("The username need to be at least 4 characters long.");
            } else if (strlen($password) < 5) {
                $exception = new Exception("the password needs to be at least 5 characters long.");
            } else {
                try {
                    $user->register();
                    new UserSession($user);
                } catch (Exception $ex) {
                    $exception = $ex;
                }
            }
        }
    }
}

if (UserSession::sessionExists()) {
    Util::redirect("analyser.php");
}
?>
<!DOCTYPE html>
<html>
<head>
    <?php require("backend/global_header.php") ?>
    <title>Login</title>
</head>
<body>
<?php
    if ($exception != null) echo ExceptionHeader::include($exception->getMessage());
?>
<header>
    <div class="row">
        <div class="col-sm-4"></div>
        <div class="col-sm-4">
            <form action="login.php" method="post" title="login">
                <p>
                    <label for="name">Name:</label>
                    <input title="username" class="form-control" type="text" value="<?php if (isset($_POST['username'])) echo $_POST['username']; ?>" name="username" id="name" autofocus/>

                </p>
                <p>
                    <label for="name">Password:</label>
                    <input title="password" class="form-control" type="password" value="" name="password" id="password"/>

                </p>
                <div class="row">
                    <div class="col-sm-7">
                        <button class="btn btn-primary btn-block" type="submit" name="action" value="login">Login</button>
                    </div>
                    <div class="col-sm-5">
                        <button class="btn btn-warning btn-block" type="submit" name="action" value="register">Register</button>
                    </div>
                </div>
            </form>
        </div>
        <div class="col-sm-4"></div>
    </div>

</header>
</body>
</html>
