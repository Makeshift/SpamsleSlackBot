var Botkit = require('botkit');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var controller = Botkit.slackbot({
    debug: false,
})

//Token import
fs.readFile("token.txt", "utf8", function(err,data) {
  if (err) throw err;
  controller.spawn({
      token: data.replace("\n","")
  }).startRTM(function (err) {
      if (err) {
          throw new Error(err)
      }
  });
});


var failedCount = 0; //Bad bad bad. Global variables bad. Fix this. Bad.

//**************Music Recognition**************
function requestPage(matchLink, callback) {
    request(matchLink, function (error, response, html) {
            //Using split on html? Not good practice, but does the job.
            var data = JSON.parse(html.split("window.STATE = ")[1].split("</script>")[0])['shares'];
            var failedCheck = false;
            //If the song hasn't been checked before, by the time we load this the first time we likely won't have URLs yet,
            //so if it fails to grab one of them, set failcheck to true.
            for (var i = 0; i < data.length; i++) {
              if ((data[i].service == "google" || data[i].service == "youtube" || data[i].service == "spotify") && data[i].matched_at == undefined && failedCount < 4) {
                failedCheck = true;
                failedCount++;
              }
            }
            //If we failed the above check, retry and increment counter.
            if (failedCheck) {
              console.log("Check failed, fail: " + failedCount);
              //Throttle and recurisve functions ftw?
              setTimeout(function() {requestPage(matchLink, callback)}, 1000);
            } else {
              //If we didn't, do whatever we need to do in the callback and reset the counter.
              callback(data);
              failedCount = 0;
            }
        });
    }

    controller.hears("<(http.*open.spotify.com.*)>", ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
        var matchLink = "https://match.audio/spotify" + message.match[1].split("spotify.com")[1]
        requestPage(matchLink, function (data) {
          bot.reply(message, generateReply(data, ["youtube","google"]));//Array is what services you wish to show
        });
    });

    controller.hears("<(http.*play.google.com/music/m.*)>", ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
        var matchLink = "https://match.audio/google/track" + message.match[1].split("google.com/music/m")[1]
        matchLink = matchLink.split("?")[0];//Deal with Google adding random question marks
        requestPage(matchLink, function (data) {
          bot.reply(message, generateReply(data, ["youtube","spotify"]));//Array is what services you wish to show
        });
    });

    function generateReply(data, services) {
      var replyMessage = "";
      for (var i = 0; i < data.length; i++) {
          if (services.indexOf(data[i].service) > -1) {
              if (data[i].streamUrl == undefined) data[i].streamUrl = "Not found.";
              if (data[i].name == undefined) data[i].name = "Not found.";
              replyMessage = replyMessage + ">" + data[i].name + " - " + data[i].service.capFirst() + ":\n>        " + "`" + data[i].streamUrl + "`\n";
          }
      }
      return replyMessage;
    }
//**************End of music recognition**************
    //Magic 8 ball
    controller.hears("!ball", ["direct_mention", "mention", "ambient"], function (bot, message) {
        eval(fs.readFileSync('magic8ball.js')+'');
        bot.reply(message, "_You pose your question to the Old Lady. She consults her crystal ball, and responds..._\n>" + possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)]);
    });
    //Fortune Lady
    controller.hears("!fortune", ["direct_mention", "mention", "ambient"], function (bot, message) {
        eval(fs.readFileSync('fortunelady.js')+'');
        bot.reply(message, "_The Old Lady consults her crystal ball, and says:_\n>"+possibleFortunes[Math.floor(Math.random() * possibleFortunes.length)]);
    });
    //Catchphrases
    controller.hears("!catchphrase", ["direct_mention", "mention", "ambient"], function (bot, message) {
        eval(fs.readFileSync('catchphrases.js')+'');
        bot.reply(message, "_The Old Lady exclaims:_\n>"+catchphrases[Math.floor(Math.random() * catchphrases.length)]);
    });
    //Helpers
    String.prototype.capFirst = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }
