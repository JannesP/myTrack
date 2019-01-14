<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 12:41
 */
declare(strict_types=1);

require_once "backend/Util.php";
Util::noSessionRedirect();
Util::redirect("application.php");
