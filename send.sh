#!/usr/bin/env bash

NUMBER="$1"
TEXT="$2"

adb shell am start -a android.intent.action.SENDTO -d "sms:$NUMBER" --es sms_body "$TEXT" --ez exit_on_sent true
sleep 1
adb shell input keyevent 22
sleep 1
adb shell input keyevent 23
