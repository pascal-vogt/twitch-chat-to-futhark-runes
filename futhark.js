(function () {
  document.addEventListener('DOMContentLoaded', function () {

    function connectChat() {
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443/', 'irc');

      ws.onmessage = function (message) {
        if (message !== null) {
          var parsed = parseMessage(message.data);
          if (parsed !== null) {
            if (parsed.command === "PRIVMSG") {
              var name = parsed.tags['display-name'];
              var color = parsed.tags['color'] || '#FFFFFF';

              var p = document.createElement('p');

              var nameSpan = document.createElement('span');
              nameSpan.innerText = name + ': ';
              nameSpan.style.color = color;
              p.appendChild(nameSpan);

              var emotes = parsed.tags['emotes'];
              var emotesSorted = [];
              if (emotes) {
                var emotes = emotes.split('/');
                for (var i = emotes.length - 1; i >= 0; --i) {
                  var idAndRanges = emotes[i].split(':');
                  var ranges = idAndRanges[1].split(',');
                  for (var j = ranges.length - 1; j >= 0; --j) {
                    var rangeParts = ranges[j].split('-');
                    emotesSorted.push({
                      from: parseInt(rangeParts[0], 10),
                      to: parseInt(rangeParts[1], 10) + 1,
                      id: idAndRanges[0]
                    });
                  }
                }
              }
              emotesSorted.sort(function (lhs, rhs) {
                return lhs.from - rhs.from;
              });
              if (emotesSorted.length === 0) {
                makeTextNode(p, parsed.message);
              } else {
                for (var i = 0; i < emotesSorted.length; ++i) {
                  var previousPos = i === 0 ? 0 : emotesSorted[i - 1].to;
                  if (previousPos !== emotesSorted[i].from) {
                    var text = parsed.message.substr(previousPos, emotesSorted[i].from - previousPos);
                    makeTextNode(p, text);
                  }
                  makeEmoteNode(p, emotesSorted[i].id);
                }
                if (emotesSorted[emotesSorted.length - 1].to !== parsed.message.length) {
                  var text = parsed.message.substr(emotesSorted[emotesSorted.length - 1].to);
                  makeTextNode(p, text);
                }
              }

              var contentsDiv = document.getElementById('contents');
              contentsDiv.appendChild(p);
              contentsDiv.scrollTop = contentsDiv.scrollHeight;

              //console.log(JSON.stringify(parsed));
            } else if (parsed.command === "PING") {
              ws.send("PONG :" + parsed.message);
            }
          }
        }
      };
      ws.onerror = function (message) {
        console.log('Error: ' + message);
      };
      ws.onclose = function () {
        console.log('Disconnected.');
      };
      ws.onopen = function () {
        if (ws !== null && ws.readyState === 1) {
          console.log('Connecting...');

          ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
          ws.send('PASS ' + BOT_OAUTH_TOKEN);
          ws.send('NICK ' + BOT_USERNAME);
          ws.send('JOIN ' + CHANNEL);
        }
      };
    }

    function runify(text) {
      var runes = 'ᚨᛒᚲᛞᛖᚠᚷᚺᛇᚲᛚᛗᚾᛟᛈᛩᚱᛋᛏᚢᚹᚹᚲᛋᛃᛋ';
      return text.replace(/[a-zA-Z]/g, function (substring) {
        var index = substring.toUpperCase().charCodeAt(0) - 65;
        return runes.charAt(index);
      });
    }
    
    function makeTextNode(parent, text) {
      var textElement = document.createTextNode(runify(text));
      parent.appendChild(textElement);
    }

    function makeEmoteNode(parent, id) {
      var imageElement = document.createElement('img');
      imageElement.src = 'https://static-cdn.jtvnw.net/emoticons/v1/' + id + '/1.0';
      parent.appendChild(imageElement);
    }

    function parseMessage(rawMessage) {
      var parsedMessage = {
        message: null,
        tags: null,
        command: null,
        original: rawMessage,
        channel: null,
        username: null
      };

      m = rawMessage.match(/^@([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) :(.*)$/s)
      if (m) {
        parsedMessage.tags = {};
        var tags = m[1].split(';');
        for (var i = tags.length - 1; i >= 0; --i) {
          var kv = tags[i].split('=');
          parsedMessage.tags[kv[0]] = kv[1];
        }
        parsedMessage.username = m[2];
        parsedMessage.command = m[3];
        parsedMessage.channel = m[4];
        parsedMessage.message = m[5];
      } else if (rawMessage.startsWith("PING")) {
        parsedMessage.command = "PING";
        parsedMessage.message = rawMessage.split(":")[1];
      }

      return parsedMessage;
    }

    connectChat();
  });
})();
