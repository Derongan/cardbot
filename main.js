var Steam = require('steam');
var fs = require('fs');


var sentry = fs.readFileSync('sentry');

var admin = "";


/*******************************************************/
/*                      Objects                        */
/*******************************************************/
var bot = new Steam.SteamClient();
var SteamTradeOffers = require('steam-tradeoffers');
var offers = new SteamTradeOffers();

var ready = false;

var sessionid = false;

bot.logOn({
    accountName: '',
    password: '',
    //authCode: ''
    shaSentryfile: sentry
});

bot.on('sentry', function(hash) {
    console.log('Storing hash: '+hash);
    fs.writeFile("sentry", hash);
});


bot.on('loggedOn', function() {
    console.log('Logged in!');
    bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
    bot.setPersonaName('1:1 Same Game Card Bot'); // to change its nickname
});

bot.on('webSessionID', function(sessionID) {
    sessionid = sessionID;
    bot.webLogOn(function(newCookie){

        offers.setup({
            sessionID: sessionID,
            webCookie: newCookie
        });
        ready = true;
    }); 
});

bot.on('error', function(e) {
    if(e.cause == 'logonFail' && e.eresult==63)
    {
        console.log('Check steamguard');
    }
    else
    {
        console.log('Error: '+e.cause);
    }
});

bot.on('tradeOffers', function(count) {
    console.log('Trade offer changed: ' + count);
    if(count > 0)
    {
        getTrades();
    }
});

bot.on('friendMsg', function(sid, message, type)
{
    
    if(type != Steam.EChatEntryType.ChatMsg)
        return;
   
    console.log(sid+": "+message);
    
    if(message[0] == '?')
    {
        switch(message.substring(1))
        {
            //case "force":
            //    bot.dealWithOffers();
            case "trade":
            case "tradeready":
                bot.sendMessage(sid, "Trade " + (ready ? "ONLINE" : "OFFLINE"));
                break;
            case "fake":
                bot.sendMessage(sid, "Faking a new trade offer coming in");
                getTrades();
                break;
            case "help":
            default:
                bot.sendMessage(sid, "Available commands: ?tradeready");
        }
    }
    else
    {
        bot.sendMessage(sid, "Input not recongized. Enter ? for info");        
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
            
            //console.log("Giving "+JSON.stringify(give));
            //console.log("Receiving "+JSON.stringify(receive));
            
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
            //console.log(offer.accountid_other);
            if(declined)
            {
                offers.declineOffer({tradeOfferId: offer.tradeofferid});
                console.warn("Declined offer #"+offer.tradeofferid+" from "+offer.accountid_other);
            }
            else
            {
                offers.acceptOffer({tradeOfferId: offer.tradeofferid},function(data,data2){
                    console.log("Accept failed with error: "+data);console.log(data2);
                    /*if(ready)
                    {
                        ready = false;
                        console.log("Reseting cookies");                        
                        bot.webLogOn(function(newCookie){
                            offers.setup(sessionid, newCookie, function(){getTrades()});
                            ready = true;
                        }); 
                    }*/
                });
                console.warn("Accepted offer #"+offer.tradeofferid+" from "+offer.accountid_other);
            }
        });
    }
    console.log("Done handling offers");
}