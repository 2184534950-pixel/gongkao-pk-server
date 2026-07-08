// ===============================
// 公务员行测竞技擂台 联机服务器
// ===============================

const WebSocket = require("ws");


// ===============================
// 创建服务器
// ===============================

const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({
    port: PORT
});


console.log("服务器启动成功");
console.log("监听端口:" + PORT);



// ===============================
// 房间数据
// ===============================

let rooms = {};




// ===============================
// 玩家连接
// ===============================

wss.on("connection", socket => {


    console.log("玩家连接");


    let player = {

        socket: socket,

        room: null,

        id: null,

        score: 0,

        index: 0,

        answers: [],

        finished:false

    };



    socket.send(JSON.stringify({

        type:"connected",

        msg:"连接服务器成功"

    }));




    // ===============================
    // 收消息
    // ===============================

    socket.on("message", msg => {


        let data;


        try{

            data = JSON.parse(msg);


        }catch(e){

            console.log("错误消息:",msg.toString());

            return;

        }



        console.log(
            "收到:",
            data.type,
            data.room || ""
        );





        // ===============================
        // 创建房间
        // ===============================


        if(data.type==="create"){


            let roomId =

            Math.floor(

                100000 +

                Math.random()*900000

            ).toString();




            rooms[roomId]={

                players:[player],

                status:"waiting"

            };



            player.room=roomId;

            player.id=1;



            console.log(
                "创建房间:",
                roomId
            );



            socket.send(JSON.stringify({

                type:"room",

                room:roomId,

                player:1

            }));



            return;

        }





        // ===============================
        // 加入房间
        // ===============================


        if(data.type==="join"){



            console.log(
                "尝试加入房间:",
                data.room
            );



            let room = rooms[data.room];



            if(!room){


                socket.send(JSON.stringify({

                    type:"error",

                    msg:"房间不存在"

                }));


                return;

            }




            if(room.players.length>=2){


                socket.send(JSON.stringify({

                    type:"error",

                    msg:"房间已满"

                }));


                return;


            }





            player.room=data.room;

            player.id=2;



            room.players.push(player);



            room.status="playing";




            console.log(

                "房间开始:",
                data.room

            );




            room.players.forEach(p=>{


                if(p.socket.readyState===1){


                    p.socket.send(JSON.stringify({

                        type:"start",

                        player:p.id


                    }));

                }


            });



            return;

        }






        // ===============================
        // 答题
        // ===============================


        if(data.type==="answer"){



            let room = rooms[player.room];



            if(!room){

                return;

            }



            player.index++;



            if(data.correct){

                player.score +=100;

            }




            player.answers.push({

                choice:data.choice,

                correct:data.correct

            });






            room.players.forEach(p=>{


                if(

                    p!==player &&

                    p.socket.readyState===1

                ){


                    p.socket.send(JSON.stringify({

                        type:"enemy",

                        index:player.index,

                        score:player.score


                    }));


                }


            });






            socket.send(JSON.stringify({

                type:"result",

                score:player.score,

                index:player.index


            }));



            return;


        }






        // ===============================
        // 提交
        // ===============================


        if(data.type==="submit"){



            let room=rooms[player.room];


            if(!room)return;



            player.finished=true;



            room.players.forEach(p=>{


                if(p.socket.readyState===1){


                    p.socket.send(JSON.stringify({

                        type:"finish",

                        player:player.id


                    }));

                }


            });



            return;

        }




    });






    // ===============================
    // 断开
    // ===============================


    socket.on("close",()=>{


        console.log(
            "玩家离开",
            player.id,
            player.room
        );



        if(player.room && rooms[player.room]){


            rooms[player.room].players =

            rooms[player.room].players.filter(

                p=>p!==player

            );



            if(

                rooms[player.room].players.length===0

            ){

                delete rooms[player.room];

            }


        }


    });



});
