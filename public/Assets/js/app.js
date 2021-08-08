let MyApp = (function () {
  var socket = null;
  var user_id = "";
  var meeting_id = "";
  function init(uid, mid) {
    user_id = uid;
    meeting_id = mid;
    event_process_for_signaling_server();
  }
  function event_process_for_signaling_server() {
    //console.log("event_process_for_signaling_server");
    socket = io.connect();
    socket.on("connect", () => {
      if (socket.connected) {
        if (user_id != "" && meeting_id != "") {
          socket.emit("userconnect", {
            displayName: user_id,
            meetingID: meeting_id,
          });
        }
      }
    });

    socket.on("inform_others_about_me", (data) => {
      //console.log("inform_others_about_me");
      //console.log(data);
      addUser(data.other_user_id, data.connId);
    });
  }

  return {
    _init(uid, mid) {
      init(uid, mid);
    },
  };
})();
