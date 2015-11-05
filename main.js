var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var fs = require('fs');
var crypto = require('crypto');
var logininfo = require('./logininfo.js');

var admin = logininfo.getinfo('i');
var logOnOptions = { account_name: logininfo.getinfo('u'), password: logininfo.getinfo('p') };
var authCode = logininfo.getinfo('a');

var sentry = fs.readFileSync('sentry');
var servers = fs.readFileSync('servers');

console.log('Logging in with user: ' + logOnOptions.account_name);

if (sentry != '') {
	logOnOptions.sha_sentryfile = getSHA1(sentry);
	console.log('Using sentry file for login!');
} else {
    logOnOptions.auth_code = authCode;
	console.log('Using authCode for login, or requesting new one. Current authCode: ' + logOnOptions.auth_code);
}

// if we've saved a server list, use it
if (servers != '') {
  Steam.servers = JSON.parse(servers);
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
var offers = new SteamTradeOffers();

var ready = false;
var sessionid = false;

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn(logOnOptions);
});

steamClient.on('logOnResponse', function(logonResp) {
	if (logonResp.eresult == Steam.EResult.OK) {
		console.log('Logged in!');
		steamFriends.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
		steamFriends.setPersonaName(logininfo.getinfo('n')); // to change its nickname
		steamUser.gamesPlayed({games_played: [{ game_id: '440' }]});
		console.log('Playing some Team Fortress 2 while waiting for trades!');
		steamWebLogOn.webLogOn(function(sessionID, newCookie) {
			getSteamAPIKey({
				sessionID: sessionID,
				webCookie: newCookie
			}, function(err, APIKey) {
				offers.setup({
					sessionID: sessionID,
					webCookie: newCookie,
					APIKey: APIKey
				});
			});
		});
	}
});

steamClient.on('servers', function(servers) {
  fs.writeFile('servers', JSON.stringify(servers));
});

steamUser.on('updateMachineAuth', function(sentry, callback) {
  fs.writeFileSync('sentry', sentry.bytes);
  callback({ sha_file: getSHA1(sentry.bytes) });
});


steamClient.on('error', function(e) {
        console.log('Error: '+e.cause);
});

steamUser.on('tradeOffers', function(count) {
    console.log('Trade offer changed: ' + count);
    if(count > 0)
    {
        getTrades();
    }
});

steamFriends.on('friendMsg', function(sid, message, type)
{
    
    if(type != Steam.EChatEntryType.ChatMsg)
        return;
   
    console.log(sid+": "+message);
    
    if(message[0] == '?')
    {
        switch(message.substring(1))
        {
            case "trade":
            case "tradeready":
                steamFriends.sendMessage(sid, "Trade " + (ready ? "ONLINE" : "OFFLINE"));
                break;
            case "fake":
                steamFriends.sendMessage(sid, "Faking a new trade offer coming in");
                getTrades();
                break;
            case "help":
            default:
                steamFriends.sendMessage(sid, "Available commands: ?tradeready");
        }
    }
    else
    {
        steamFriends.sendMessage(sid, "Input not recongized. Enter ? for info");        
    }
});

function getTrades()
{
    console.log("Getting trades");
    offers.getOffers(
    {
        get_received_offers: 1, 
        active_only: 1,
        time_historical_cutoff: Math.round(Date.now() / 1000) - 30,
        get_descriptions: 1
    }, handleTrades);
}

function handleTrades(error, body)
{
    console.log("Handling trades");
    if((body.response && body.response.trade_offers_received))
    {
        console.log("Trades to handle are good!");        
        var descriptions = new Object();
        
        
        //Set up a usable array of descriptions
        try
        {
            body.response.descriptions.forEach(function(description)
            {
                if(description.appid == 753)
                    descriptions[description.classid] = description.type;
            });
        }
        catch(err)
        {
            console.log("Error parsing descriptions: ", err)
        }
        //console.log(descriptions);
        //console.log(body.response.descriptions);
        
        
        console.log("Handling " + body.response.trade_offers_received.length + " offers");

        body.response.trade_offers_received.forEach(function(offer)
        {
            //offers.declineOffer(offer.tradeofferid);
            //return;
            if(offer.trade_offer_state != 2)
                return;
                
            console.log("Handling offer #"+offer.tradeofferid);
            var declined = false;
            
            var receive = new Object();
            var give = new Object();
            
            var give_set = new Object();
            var receive_set = new Object();

            try
            {
                offer.items_to_give.forEach(function(item)
                {
                    if(item.appid != "753" || item.contextid != "6")    //Not a trading card
                    {
                        declined = true;
                        console.log("Items are not cards for trade #" + offer.tradeofferid);
                        return;
                    }
                    else
                    {
                        give[item.classid] ? give[item.classid] += 1 : give[item.classid] = 1;
                    }
                });
            }
            catch(err)
            {
                console.log(err.message);
                console.log("No items asked for in trade #" + offer.tradeofferid);
            }
            
            
            try
            {
                offer.items_to_receive.forEach(function(item)
                {
                    if(item.appid == "753" && item.contextid == "6")    //Trading card
                    {
                        receive[item.classid] ? receive[item.classid] += 1 : receive[item.classid] = 1;
                    }
                    else
                    {
                        receive['free'] += 1;
                    }
                });
            }
            catch(err)
            {
                console.log(err.message);                            
                console.log("No items offered in trade #" + offer.tradeofferid);
                //console.log("Setting declined to true");
                declined = true;
            }
            
            console.log("Giving "+JSON.stringify(give));
            console.log("Receiving "+JSON.stringify(receive));
            
            for(itemid in give)
            {
                if(give_set[descriptions[itemid]])
                {
                    give_set[descriptions[itemid]] += give[itemid];
                }
                else
                {
                    give_set[descriptions[itemid]] = give[itemid];
                }
            }
            
            for(itemid in receive)
            {
                if(receive_set[descriptions[itemid]])
                {
                    receive_set[descriptions[itemid]] += receive[itemid];
                }
                else
                {
                    receive_set[descriptions[itemid]] = receive[itemid];
                }
            }
            
            //console.log(give_set);
            //console.log(receive_set);
            
            for(cardclass in give_set)
            {
                if(!receive_set[cardclass])
                    declined = true;
                else
                {
                    if(give_set[cardclass] > receive_set[cardclass])
                        declined = true;
                }
            }
            //console.log(offer.steamid_other);
			//Admin override trade restrictions
			if (offer.steamid_other === admin) {
				declined = false;
				console.log('This is an admin trade, setting declined to false to allow trade no matter what!');
			}
            if(declined)
            {
                offers.declineOffer({tradeOfferId: offer.tradeofferid});
                console.warn("Declined offer #"+offer.tradeofferid+" from "+offer.steamid_other);
            }
            else
            {
                offers.acceptOffer({tradeOfferId: offer.tradeofferid},function(data,data2){
                    console.log("Accept failed with error: "+data);console.log(data2);
                    /*if(ready)
                    {
                        ready = false;
                        console.log("Reseting cookies");                        
                        steamUser.webLogOn(function(newCookie){
                            offers.setup(sessionid, newCookie, function(){getTrades()});
                            ready = true;
                        }); 
                    }*/
                });
                console.warn("Accepted offer #"+offer.tradeofferid+" from "+offer.steamid_other);
            }
        });
    }
    console.log("Done handling offers");
}

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}