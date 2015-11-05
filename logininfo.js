/*
Steam64 ID of admin (Example: 12345678901234567)
Any trades sent from this ID will bypass all restrictions,
like a trade only requesting cards or requesting more cards
then offering.
*/
var adminsteamid = '';
/*
Usename & password for steam, pretty self-explainatory.
*/
var steamusername = '';
var steampassword = '';
/*
SteamGuard Code, leave this blank and run the bot once and
you should receive an email shortly after with the code.
*/
var steamguardcode = '';
/*
The steam community name you would like your bot to use, it will switch name if you edit this.
*/
var steambotname = '1:1 Card Trading Bot';

/*
Export code to be able to actually use the settings
in main app,this node.js is kinda silly.
*/
exports.getinfo = function(f) {
	if (f === 'i') { return adminsteamid; }
	else if (f === 'u') { return steamusername; }
	else if (f === 'p') { return steampassword; }
	else if (f === 'a') { return steamguardcode; }
	else if (f === 'n') { return steambotname; }
	else { return null; }
}