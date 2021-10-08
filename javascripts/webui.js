var twist;
var cmdVel;
var publishImmidiately = true;
var robot_IP;
var manager;
var teleop;
var ros;
var goal;
var movebaseClient;
var goalMsg;
var btnGo;
var btnBack;
var btnStop;

function moveAction(linear, angular) {
    if (linear !== undefined && angular !== undefined) {
        twist.linear.x = linear;
        twist.angular.z = angular;
    } else {
        twist.linear.x = 0;
        twist.angular.z = 0;
    }
    cmdVel.publish(twist);
}

function initVelocityPublisher() {
    // Init message with zero values.
    twist = new ROSLIB.Message({
        linear: {
            x: 0,
            y: 0,
            z: 0,
        },
        angular: {
            x: 0,
            y: 0,
            z: 0,
        },
    });

    // Init topic object
    cmdVel = new ROSLIB.Topic({
        ros: ros,
        name: "/joy_vel",
        messageType: "geometry_msgs/Twist",
    });
    // Register publisher within ROS system
    cmdVel.advertise();
}

function initTeleopKeyboard() {
    // Use w, s, a, d keys to drive your robot

    // Check if keyboard controller was aready created
    if (teleop == null) {
        // Initialize the teleop.
        teleop = new KEYBOARDTELEOP.Teleop({
            ros: ros,
            topic: "/joy_vel",
        });
    }

    // Add event listener for slider moves
    var robotSpeedRange = document.getElementById("robot-speed");
    robotSpeedRange.oninput = function () {
        teleop.scale = robotSpeedRange.value / 100;
    };
}

function createJoystick() {
    // Check if joystick was aready created
    if (manager == null) {
        joystickContainer = document.getElementById("joystick");
        // joystck configuration, if you want to adjust joystick, refer to:
        // https://yoannmoinet.github.io/nipplejs/
        var options = {
            zone: joystickContainer,
            position: { left: 50 + "%", top: 105 + "px" },
            mode: "static",
            size: 200,
            color: "#0066ff",
            restJoystick: true,
        };
        manager = nipplejs.create(options);
        // event listener for joystick move
        manager.on("move", function (evt, nipple) {
            // nipplejs returns direction is screen coordiantes
            // we need to rotate it, that dragging towards screen top will move robot forward
            var direction = nipple.angle.degree - 90;
            if (direction > 180) {
                direction = -(450 - nipple.angle.degree);
            }
            // convert angles to radians and scale linear and angular speed
            // adjust if youwant robot to drvie faster or slower
            var lin = Math.cos(direction / 57.29) * nipple.distance * 0.005;
            var ang = Math.sin(direction / 57.29) * nipple.distance * 0.05;
            // nipplejs is triggering events when joystic moves each pixel
            // we need delay between consecutive messege publications to
            // prevent system from being flooded by messages
            // events triggered earlier than 50ms after last publication will be dropped
            if (publishImmidiately) {
                publishImmidiately = false;
                moveAction(lin, ang);
                setTimeout(function () {
                    publishImmidiately = true;
                }, 50);
            }
        });
        // event litener for joystick release, always send stop message
        manager.on("end", function () {
            moveAction(0, 0);
        });
    }
}

function initMoveBaseClient() {
    movebaseClient = new ROSLIB.ActionClient({
        ros: ros,
        serverName: "/move_base",
        actionName: "move_base_msgs/MoveBaseAction",
    });
    btnGo = document.getElementById("btnGo");
    btnBack = document.getElementById("btnBack");
    btnStop = document.getElementById("btnStop");
    // btnGo.addEventListener('click',sendGoal(3.85,7.68,0.707,0.707));
    // btnBack.addEventListener('click',sendGoal(3.85,-5.90,0.707,0.707));

    btnGo.addEventListener("click", function (event) {
        movebaseClient.cancel();
        sendGoal(13.7, 2.0, 0.707, 0.707);
    });
    btnBack.addEventListener("click", function (event) {
        movebaseClient.cancel();
        sendGoal(0.00, 0.00, 0.00, 1.00);
    });

    btnStop.addEventListener("click", function (event) {
        movebaseClient.cancel();
    });
}

function sendGoal(posX, posY, oriZ, oriW) {
    if (
        posX !== undefined &&
        posY !== undefined &&
        oriZ !== undefined &&
        oriW !== undefined
    ) {
        goalMsg = new ROSLIB.Message({
            target_pose: {
                header: {
                    frame_id: "map",
                    // stamp: Date.now()
                },
                pose: {
                    position: {
                        x: posX,
                        y: posY,
                        z: 0,
                    },
                    orientation: {
                        x: 0,
                        y: 0,
                        z: oriZ,
                        w: oriW,
                    },
                },
            },
        });
    }
    // if (posX !== undefined && posY !== undefined && oriZ !== undefined && oriW !== undefined) {
    //     goalMsg.target_pose.pose.position.x = posX;
    //     goalMsg.target_pose.pose.position.y = posY;
    //     goalMsg.target_pose.pose.orientation.z = oriZ;
    //     goalMsg.target_pose.pose.orientation.w = oriW;
    // } else {
    //     goalMsg.target_pose.pose.position.x = 0;
    //     goalMsg.target_pose.pose.position.y = 0;
    //     goalMsg.target_pose.pose.orientation.z = 0;
    //     goalMsg.target_pose.pose.orientation.w = 1;
    // }

    goal = new ROSLIB.Goal({
        actionClient: movebaseClient,
        goalMessage: goalMsg,
    });

    goal.send();
}

function init() {
    // determine robot address automatically
    robot_IP = location.hostname;
    // set robot address statically
    // robot_IP = "192.168.3.82";

    // // Init handle for rosbridge_websocket
    ros = new ROSLIB.Ros({
        url: "ws://" + robot_IP + ":9090",
    });

    initVelocityPublisher();
    createJoystick();
    initTeleopKeyboard();
    initMoveBaseClient();

    // get handle for video placeholder
    video = document.getElementById("video");
    // Populate video source
    video.src =
        "http://" +
        robot_IP +
        ":8080/stream?topic=/camera/rgb/image_raw&type=mjpeg&quality=80";
    video.onload = function () {
        // joystick and keyboard controls will be available only when video is correctly loaded
        // createJoystick();
        // initTeleopKeyboard();
    };
}
