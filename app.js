const advAxios = require('./axiosConfig');

// global variables
var currentRoom = null;
var cooldown = 20;

// initializing the game
advAxios
    .get('init')
    .then(res => {
        console.log('initializing', res.data);
        // set the current room to res.data
        currentRoom = res.data;
        cooldown = currentRoom.cooldown
    })
    .catch(err => console.log('init error', err));

// create new list to record traversal path
var traversalPath = [];

// create empty graph
var graph = {};

// define direction to go back upon dead end
function backwards(dir) {
    var result = "";
    if (dir == "n") {
        result = "s";
    } else if (dir = "e") {
        result = "w";
    } else if (dir = "s") {
        result = "n";
    } else if (dir = "w") {
        result = "e";
    }
    return result
}

// create new list to record backwards movement
var backwardsPath = [];

// looping all rooms until we traverse all 500 rooms

function loopRooms() {
    var roomNum = currentRoom.room_id
    // add the current room's id to our graph and add it as a new key
    if (!graph[roomNum]) {
        graph[roomNum] = {};
    }
    // add the exits of current room id to graph
    currentRoom.exits.forEach(exit => {
        // if the exit is not listed, add the value as "?" to signify not traversed
        if (graph[roomNum][exit] == undefined) {
            graph[roomNum][exit] = "?"
        }
    });

    console.log('list of rooms traversed', graph);
    console.log('number of rooms traversed', Object.keys(graph).length);

    // collect list of directions in current room id that hasn't been traversed yet (has value of "?")
    var directions = [];
    for (var key in graph[roomNum]) {
        if (graph[roomNum][key] == "?") {
            directions.push(key);
        }
    }
    
    // traversing rooms
    if (directions.length > 0) {
        // get our next move from first path in directions and reset directions for the next room
        var nextMove = directions[0];
        directions = [];
        // record the back movement and push it to backwardsPath
        var backMove = backwards(nextMove);
        backwardsPath.push(backMove);

        traversalPath.push(nextMove);
        // send the post request to move
        setTimeout(() => { // have to settimeout bc there is a cooldown to make request to move again
            advAxios
                .post('move', { direction: nextMove})
                .then(res => {
                    console.log('moving to a room', res.data)
                    // save the previous room's id and set it to the current
                    var prevRoom = roomNum
                    currentRoom = res.data;
                    // update the value in graph of prevRoom
                    graph[prevRoom][nextMove] = currentRoom.room_id;
                    var newRoom = currentRoom.room_id;
                    // loot items if there are any
                    if (currentRoom.items.length) {
                        setTimeout(() => {
                            advAxios
                                .post('take', { name: 'treasure' })
                                .then(res => {
                                    res.data
                                    console.log('looting this treasure');
                                    cooldown = res.data.cooldown;
                                })
                                .catch(err => console.log(err.message))
                        }, cooldown * 1000);
                    }
                    // add new room id to graph
                    if (!graph[newRoom]) {
                        graph[newRoom] = {};
                    }
                    // add the value of exits for newRoom
                    currentRoom.exits.forEach(exit => {
                        if (!graph[newRoom][exit]) {
                            graph[newRoom][exit] = "?";
                        }
                    });
                    // update graph with for current room with prevRoom
                    graph[newRoom][backMove] = prevRoom;
                    // gets the cooldown of the specific room
                    cooldown = currentRoom.cooldown 
                    // recursively traverses
                    if (Object.keys(graph).length !== 500) {
                        console.log("there's still more rooms to explore");
                        setTimeout(() => {
                            loopRooms();
                        }, cooldown * 1000); // waits room cooldown * 1s before sending post request again
                    }
                })
                .catch(err => console.log(err.message));
        }, cooldown * 1000);
    }
    // handle dead ends
    else if (directions.length == 0 && backwardsPath.length) {
        console.log("this is a dead end or i've already visited this room. tracing my steps backwards now");
        // save the last move and add the backwards move to the end of traversePath
        var lastMove = backwardsPath.pop()
        traversalPath.push(lastMove);
        // save the room id we're moving to as string for wise explorer
        var lastRoom = graph[roomNum][lastMove].toString();
        console.log("lastRoom", lastRoom)
        // send post request to continue moving
        setTimeout(() => {
            advAxios
                .post('move', { direction: lastMove, next_room_id: lastRoom })
                .then(res => {
                    // set our current room
                    currentRoom = res.data;
                    cooldown = res.data.cooldown;
                    console.log("i moved back, i'm now in room:", currentRoom.room_id, "i can move again in:", cooldown)
                    // recursively traverses
                    if (Object.keys(graph).length !== 500) {
                        console.log("that was a dead end. let's go another direction");
                        setTimeout(() => {
                            loopRooms();
                        }, cooldown * 1000);
                    }
                })
                .catch(err => console.log(err.message))
        }, cooldown * 1000) 
    }
    else if (directions.length == 0 && backwardsPath.length == 0) {
        console.log("this is the end of the road", Object.keys(graph).length);
        return graph;
    }
}

// set timeout; rooms need to initialize and load before moving
setTimeout(() => { 
    loopRooms();
}, cooldown * 1000);