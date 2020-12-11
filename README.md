# slack-custom-status
Quickly read and change your Slack status/emoji/active/snooze status from a Chrome Extension

Modifying your "presence" in Slack can be a multi-step process which is especially painful if you're always rotating the same set of presences. For example, when you go to lunch, you might want to change your emoji to a plate, your status text to "away for lunch", snooze your notifications for 60 minutes, and change from Active to Away. You may even want to note in the status text when you'll return. Slack Custom Status makes this easy and intuitive by reducing ten clicks to two.

![Image of Extension](https://i.imgur.com/UhOxtjU.png)

## Getting Started

1. Download this repo from Github to your local drive into one folder.
2. Follow [these instructions](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/) to manually install the extension to Chrome by enabling Developer mode in Extensions and loading the files. (*Note: Always review the code you're installing manually as it could be malicious*).
3. Login to Slack in your browser and navigate to the [legacy tokens](https://api.slack.com/legacy/custom-integrations/legacy-tokens) page. (*Note: Slack no longer offers the generation of legacy tokens. A future update to this extension will conform to the new standards*).
4. Generate a token and paste it into the Settings of the Slack Custom Status extension.

## Adding a Status

1. Click on the plus button at the top right of the app.
2. Find your emoji's shortname and type it into the emoji box. Add text for your status, and choose if you'll be active or implement a number of snooze minutes.
3. Click the Add button and then it will be available for you to "play" from the listing!
4. If you want to include the time you'll return from snooze in the text of your status, include "%t" in your text and it will be replaced with the projected time based on the formatting you choose from the settings panel.

## Technologies Used

- AngularJS 1.5
- Bootstrap 3
- MomentJS
