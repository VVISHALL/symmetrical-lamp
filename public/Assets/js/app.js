let AppProcess = (function () {
  let peers_connection_ids = []; // Array of connection ids of peers
  let peers_connection = []; // Array of connections of peers
  let remote_vid_stream = []; // Array of remote video stream
  let remote_aud_stream = []; // Array of remote audio stream

  let serverProcess;
  // We are taking SDP_function & my_connId from MyApp on socket connection
  function _init(SDP_function, my_connId) {
    serverProcess = SDP_function;
    my_connection_id = my_connId;
  }
  let iceConfiguration = {
    iceServers: [
      {
        url: "stun:stun.l.google.com:19302",
      },
      {
        url: "turn:turn.bistri.com:80",
        credential: "homeo",
        username: "homeo",
      },
      {
        url: "turn:turn.anyfirewall.com:443?transport=tcp",
        credential: "webrtc",
        username: "webrtc",
      },
    ],
  };

  function setConnection(connId) {
    let connection = new RTCPeerConnection(iceConfiguration);

    connection.onnegotiationneeded = async function (event) {
      await setOffer(connId);
    };
    connection.onicecandidate = function (event) {
      if (event.candidate) {
        serverProcess(
          JSON.stringify({
            icecandidate: event.candidate,
          }),
          connId
        );
      }
    };

    // This connection.ontrack basically will happen/occur
    // when there will be available track in the connection
    connection.ontrack = function (event) {
      console.log("on track", event);

      if (!remote_vid_stream[connId]) {
        remote_vid_stream[connId] = new MediaStream();
      }
      if (!remote_aud_stream[connId]) {
        remote_aud_stream[connId] = new MediaStream();
      }

      // this will run if video.track is available on the event
      if (event.track.kind == "video") {
        remote_vid_stream[connId]
          .getVideoTrack()
          .forEach((t) => remote_vid_stream[connId].removeTrack(t)); // Remove track if it exists
        remote_vid_stream[connId].addTrack(event.track); // Add video track
        // Get video player
        let remoteVideoPlayer = document.getElementById("v_" + connId);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remote_vid_stream[connId]; // Set video stream
        remoteVideoPlayer.load(); // Load video stream
      } else if (event.track.kind == "audio") {
        remote_aud_stream[connId]
          .getAudioTracks()
          .forEach((t) => remote_aud_stream[connId].removeTrack(t)); // Remove track if it exists
        remote_aud_stream[connId].addTrack(event.track); // Add audio track
        // Get audio player
        let remoteAudioPlayer = document.getElementById("a_" + connId);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remote_aud_stream[connId]; // Set audio stream
        remoteAudioPlayer.load(); // Load audio stream
      }
    };
    peers_connection_ids[connId] = connId; // Add connection id to array
    peers_connection[connId] = connection; // Add connection to array

    return connection;
  }

  function setOffer(connId) {
    // Get connection from array and store it in the variable
    let connection = peers_connection[connId];
    // Create offer
    let offer = await connection.createOffer();
    // Set local description using created offer
    await connection.setLocalDescription(offer);
    // Send offer to peer
    serverProcess(
      JSON.stringify(
        {
          // sending offer property with value of local
          // description to other users
          // in order to identify my connection
          offer: connection.localDescription,
        },
        connId
      )
    );
  }

  return {
    setNewConnection: async function (connId) {
      await setConnection(connId);
    },
    init: async function (SDP_function, my_connId) {
      await _init(SDP_function, my_connId);
    },
    processClientFunc: async function (SDP_function, my_connId) {
      await SDPProcess(data, from_connId);
    },
  };
})();

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

    let SDP_function = function (data, to_connId) {
      // this will go to server.js on the event of SDPProcess
      socket.emit("SDPProcess", {
        message: data,
        to_connId: to_connId,
      });
    };
    socket.on("connect", () => {
      console.log("socket connected");
      if (socket.connected) {
        AppProcess.init(SDP_function, socket.id);
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
      AppProcess.setNewConnection(data.connId);
    });
    socket.on("SDPProcess", async function (data) {
      await AppProcess.processClientFunc(data.message, data.from_connId);
    });
  }

  function addUser(other_user_id, connId) {
    //console.log("addUser");
    //console.log(other_user_id);
    //console.log(connId);
    var newDivId = $("#otherTemplate").clone();
    newDivId = newDivId.attr("id", "connId").addClass("other");
    newDivId.find("h2").text(other_user_id);
    // when add any user, we set `v_${connId}` to a particular video
    newDivId.find("video").attr("id", `v_${connId}`);
    // when add any user, we set `a_${connId}` to a particular audio
    newDivId.find("audio").attr("id", `a_${connId}`);
    newDivId.show();
    $("#divUsers  ").append(newDivId);
  }

  return {
    _init(uid, mid) {
      init(uid, mid);
    },
  };
})();
