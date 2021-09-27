function init() {
    // determine robot address automatically
    var robot_IP = location.hostname;
    // set robot address statically
    // robot_IP = "192.168.3.82";
    // Connect to ROS.

    var ros = new ROSLIB.Ros({
        url: "ws://" + robot_IP + ":9090"
    });

    // Create the main viewer.
    var viewer = new ROS2D.Viewer({
        divID: "nav",
        width: 600,
        height: 500
    });

    // Setup the nav client.
    // var nav = new NAV2D.OccupancyGridClientNav({
    //     ros: ros,
    //     rootObject: viewer.scene,
    //     viewer: viewer,
    //     topic: "/map",
    //     continous: true,
    //     actionName: "move_base_msgs/MoveBaseAction",
    //     withOrientation: true,
    //     serverName: "/move_base",
    // });

    // Add zoom to the viewer.
    var zoomView = new ROS2D.ZoomView({
        rootObject: viewer.scene
    });
    // Add panning to the viewer.
    var panView = new ROS2D.PanView({
        rootObject: viewer.scene
    });

    // Setup the map client.
    var gridClient = new ROS2D.OccupancyGridClient({
        ros: ros,
        rootObject: viewer.scene
    });

    // Add planned path
    var plannedPath = new ROS2D.NavPath({
        ros: ros,
        rootObject: viewer.scene,
        pathTopic: "/move_base/TrajectoryPlannerROS/local_plan"
    });

    // Add robot pose and trace
    var robotTrace = new ROS2D.PoseAndTrace({
        ros: ros,
        rootObject: viewer.scene,
        poseTopic: "/robot_pose",
        withTrace: true,
        maxTraceLength: 200
    });

    // Add navigation goal
    var navGoal = new ROS2D.NavGoal({
        ros: ros,
        rootObject: viewer.scene,
        actionTopic: "/move_base"
    });

    // Scale the canvas to fit to the map
    gridClient.on("change", function () {
        viewer.scaleToDimensions(
            gridClient.currentGrid.width,
            gridClient.currentGrid.height
        );
        viewer.shift(
            gridClient.currentGrid.pose.position.x,
            gridClient.currentGrid.pose.position.y
        );
        plannedPath.initScale();
        robotTrace.initScale();
        navGoal.initScale();
        registerMouseHandlers();
    });

    function registerMouseHandlers() {
        // Setup mouse event handlers
        var mouseDown = false;
        var zoomKey = false;
        var panKey = false;
        var startPos = new ROSLIB.Vector3();
        viewer.scene.addEventListener("stagemousedown", function (event) {
            if (event.nativeEvent.ctrlKey === true) {
                zoomKey = true;
                zoomView.startZoom(event.stageX, event.stageY);
            } else if (event.nativeEvent.shiftKey === true) {
                panKey = true;
                panView.startPan(event.stageX, event.stageY);
            } else {
                var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
                navGoal.startGoalSelection(pos);
            }
            startPos.x = event.stageX;
            startPos.y = event.stageY;
            mouseDown = true;
        });
    
        viewer.scene.addEventListener("stagemousemove", function (event) {
            if (mouseDown === true) {
                if (zoomKey === true) {
                    var dy = event.stageY - startPos.y;
                    var zoom = 1 + (10 * Math.abs(dy)) / viewer.scene.canvas.clientHeight;
                    if (dy < 0) zoom = 1 / zoom;
                    zoomView.zoom(zoom);
                } else if (panKey === true) {
                    panView.pan(event.stageX, event.stageY);
                } else {
                    var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
                    navGoal.orientGoalSelection(pos);
                }
            }
        });        

        viewer.scene.addEventListener("stagemouseup", function (event) {
            if (mouseDown === true) {
                if (zoomKey === true) {
                    zoomKey = false;
                } else if (panKey === true) {
                    panKey = false;
                } else {
                    var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
                    var goalPose = navGoal.endGoalSelection(pos);
                    navGoal.sendGoal(goalPose);
                }
                mouseDown = false;
            }
        });
    }            
}
