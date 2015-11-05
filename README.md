###What is this?
---
This is a simple steam cardbot, made to trade cards 1 to 1 for the same game.
--
It uses nodesteam, steam-weblogon, steam-web-api-key and steam-tradeoffers.
--
--
###How to setup
---
1. Make sure you have node.js working and installed steam, steam-weblogon, steam-web-api-key and steam-tradeoffers with npm.
2. Make sure all the files needed from the git is in your directory, currently this includes a blank sentry and servers file.
3. Edit the logininfo.js file, simply put in the steam username and password of your bot, eventually fill in adminsteamid with the Steam64 ID of who is gonna be the bot's master. :)
4. Run the bot once without steamguardcode filled in, this way the bot will request a new code for you, then fill in the code from e-mail.
5. Now make any final changes, like bot steam community name, etc. in the config file and launch the bot again and enjoy.
--
--
###Issues
- If your bot won't accept trades or cannot receive any at all, it is usually caused by the 7 days trade cooldown you get when logging in from a new location.
- Not having the sentry and servers file (should be there as blank files to start), might cause the bot to crash on startup.