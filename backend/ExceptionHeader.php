<?php
/**
 * Created by PhpStorm.
 * User: Jannes Peters
 * Date: 07.11.2016
 * Time: 15:19
 */
class ExceptionHeader {
    public static function include($exceptionText) {
$str = <<< text
<div class="alert alert-danger">
    <strong>Error!</strong> $exceptionText
</div>
text;
        return $str;
    }
}
