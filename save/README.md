Move SMS messages from Android phone to a JSON file with this command:

    node . /home/jakutis/Android/Sdk/platform-tools/adb /home/jakutis/repos/git/wiki/sms.json

Note that the JSON file must already contain a valid JSON array.
You can initialize the JSON file with this command:

    echo [] >> /home/jakutis/repos/git/wiki/sms.json
