document.querySelector("#author").value = localStorage.getItem("author") || "";

function escapeHTML(str) {
    return str.replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function request(method, url, message){
  var request = new XMLHttpRequest();
  request.open(method, url, true);
  request.addEventListener("load", function(){
    if(request.status < 400){

    } else {
      alert("Request failed");
    }
  });
  
  request.addEventListener("readystatechange", function(){
    if (request.readyState == XMLHttpRequest.DONE) {
        // alert("The server responded with the status: " + request.status);
    }
  });
  
  request.addEventListener("error", function(){
    alert("A network error occured");
  });
  request.send(JSON.stringify(message));
}

function requestMessage(method, url){
  var request = new XMLHttpRequest();
  request.open(method, url, true);
  request.addEventListener("load", function(){
    if(request.status < 400){
      if (request.readyState == XMLHttpRequest.DONE) {
        var data = JSON.parse(request.responseText);
        console.log(data);
        lastServerTime = data.serverTime;
        if(data.clear) chatbox.innerHTML = "";
        data.messages.forEach(function(message){
          drawMessage(message);
        });
        var onlineUsers = data.onlineUsers;
        onlineUsers.sort();
        var onlineUsersDiv = document.querySelector("#online-users");
        onlineUsersDiv.innerHTML = "Who's online: ";
        if(onlineUsers){
          onlineUsers.forEach(function(user, i){
            if(i != 0) onlineUsersDiv.innerHTML += ", ";
            onlineUsersDiv.innerHTML += user;
          });
        }
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    } else {
      console.log("Request failed "+ request.responseText);
    }
    getNewMessages();
  });
  
  request.addEventListener("error", function(){
    alert("A network error occured");
  });
  request.send();
}
var chatbox = document.querySelector("#chatbox");
function drawMessage(message){
  var node = document.createElement("div");
  node.innerHTML = `<div class="author-name">${escapeHTML(message.author)}</div>: <div class="message">${escapeHTML(message.content)}</div>`;
  chatbox.appendChild(node);
}

var lastServerTime = 0;
function getNewMessages(){
  var sessName = document.querySelector("#author").value || "Anonymous";
  requestMessage("GET", "/messages?since="+lastServerTime+"&author="+sessName);
}

function sendMessage(){
  var message = {};
  message.author = document.querySelector("#author").value || localStorage.getItem("author") || "Anonymous";
  message.content = document.querySelector("#message").value || "";

  localStorage.setItem("author", message.author);
  request("PUT", "/sendMessage", message);

}
var chatForm = document.querySelector("#chat-form");
chatForm.addEventListener("submit", function(e){
  e.preventDefault();
  document.querySelector("#send-btn").classList.add("pressed");
  setTimeout(function(){
    document.querySelector("#send-btn").classList.remove("pressed");
  }, 100);
  sendMessage();
  document.querySelector("#message").value = "";
});

function clearChat(){
  chatbox.innerHTML = "";
  request("DELETE", "/clear");
}
getNewMessages();
