// ===============================
// 公务员行测竞技擂台 联机服务器
// ===============================


const WebSocket = require("ws");


// 创建服务器
const PORT = process.env.PORT || 3000;


const wss = new WebSocket.Server({
    port:PORT
});


// 房间数据
let rooms={};



console.log("服务器启动成功");
console.log("端口:3000");



// 玩家连接
wss.on("connection",socket=>{


    console.log("玩家连接");


    let player={

        socket:socket,

        room:null,

        id:null,

        score:0,

        index:0,

        answers:[]

    };



    // 收消息

    socket.on("message",msg=>{


        let data=JSON.parse(msg);



        // ====================
        // 创建房间
        // ====================

        if(data.type==="create"){


            let roomId=
            Math.floor(
                100000+
                Math.random()*900000
            ).toString();



            rooms[roomId]={

                players:[player],

                status:"waiting"

            };


            player.room=roomId;

            player.id=1;



            socket.send(JSON.stringify({

                type:"room",

                room:roomId,

                player:1

            }));



        }



        // ====================
        // 加入房间
        // ====================


        if(data.type==="join"){


            let room=
            rooms[data.room];



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



            // 通知双方开始


            room.status="playing";



            room.players.forEach((p)=>{


                p.socket.send(JSON.stringify({

                    type:"start",

                    player:p.id

                }));


            });


        }





        // ====================
        // 玩家答题
        // ====================


        if(data.type==="answer"){



            let room=
            rooms[player.room];


            if(!room)return;



            player.index++;



            if(data.correct){

                player.score+=100;

            }



            player.answers.push({

                choice:data.choice,

                correct:data.correct

            });



            // 告诉对手进度


            room.players.forEach(p=>{


                if(p!==player){


                    p.socket.send(JSON.stringify({

                        type:"enemy",

                        index:player.index,

                        score:player.score


                    }));


                }


            });



            // 回复自己


            player.socket.send(JSON.stringify({

                type:"result",

                score:player.score,

                index:player.index


            }));


        }





        // ====================
        // 提交
        // ====================


        if(data.type==="submit"){


            let room=
            rooms[player.room];


            player.finished=true;



            room.players.forEach(p=>{


                p.socket.send(JSON.stringify({

                    type:"finish",

                    player:player.id

                }));


            });


        }


    });



    // 断开

    socket.on("close",()=>{


        console.log("玩家离开");


    });



});