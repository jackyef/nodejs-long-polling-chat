var http = require("http");
var Router = require("./router");
var ecstatic = require("ecstatic");

var fileServer = ecstatic({root: "./public"});
var router = new Router();
var port = process.env.PORT || 8000;
http.createServer(function(request, response) {
  if (!router.resolve(request, response))
    fileServer(request, response);
}).listen(port);

function respond(response, status, data, type) {
  response.writeHead(status, {
    "Content-Type": type || "text/plain"
  });
  response.end(data);
}
function respondJSON(response, status, data) {
  respond(response, status, JSON.stringify(data),
          "application/json");
}

var messages = [];

router.add("PUT", /^\/sendMessage$/, function(request, response, title) {
  var body = "";
  request.on("data", function(chunk){
      body += chunk;
  });
  request.on("end", function(){
    var message = JSON.parse(body);
    message.timestamp = new Date().getTime();
    messages.push(message);
    // waitForChanges(message.timestamp, response);
    sendChanges();
    console.log("Received a new message:", message);
    respond(response, 200, "Message sent successfully!", null);
  });
});

var waitingRequests = [];
var onlineUsers = [];

router.add("GET", /^\/messages$/, function(request, response, title) {
  var query = require("url").parse(request.url, true).query;
  var since = (query.since) || 0;
  var sessName = query.author || "Anonymous"; 
  if(since == 0 && messages.length > 0){  
    var data = {};
    messages.push({author: "SYSTEM", content: `${query.author} just joined the chat.`, timestamp: new Date().getTime()});
    data.onlineUsers = onlineUsers;
    data.serverTime = new Date().getTime();
    data.messages = (messages);
    respondJSON(response, 200, data);
    sendChanges();
  } else {
    //wait for new messages
    // waitForChanges(since, response, sessName);
  }
  console.log("a request has been gotten");
  waitForChanges(since, response, sessName);
});
router.add("DELETE", /^\/clear$/, function(request, response, title) {
  console.log("accepted a clear chat history request");
  messages = [{author: "SYSTEM", content: "--Chat history cleared--", timestamp: new Date().getTime()}];
  sendChanges(true);
});

function waitForChanges(since, response, sessName){
    var waiter = {since: since, response: response, sessName: sessName};
    waitingRequests.push(waiter);
    onlineUsers.push(waiter.sessName);
    setTimeout(function(){
        var found = waitingRequests.indexOf(waiter);
        if(found > -1){
            waitingRequests.splice(found, 1);
            var data = {};
            data.onlineUsers = onlineUsers;
            data.serverTime = new Date().getTime();
            data.messages = [];
            respondJSON(response, 200, data);
            console.log("timeout, sending response to keep alive");
            console.log("sent list of online users: ", data.onlineUsers);
            onlineUsers.splice(found, 1);
        }
    }, 15 * 1000);
    console.log("waiting requests number:", onlineUsers.length);
    onlineUsers.forEach(function(user,i){
        console.log(i+1+".", user);
    });
}

function sendChanges(clear){
    while(waitingRequests.length > 0){
        var data = {};
        data.onlineUsers = onlineUsers;
        console.log("sent list of online users: ", data.onlineUsers);
        var request = waitingRequests.shift();
        var changes = [];
        var since = request.since;
        var seen = [];
        for(var i = messages.length-1; i >= 0; i--){
            if(messages[i].timestamp <= since){
                break;
            // } else if(messages[i] in seen){
            //     continue;
            } else {
                changes.push(messages[i]);
                seen.push(messages[i]);
            }
        }
        data.serverTime = new Date().getTime();
        data.messages = changes;
        data.clear = clear;
        respondJSON(request.response, 200, data); //respond to the request that has been waiting
    };
    onlineUsers = [];
}
