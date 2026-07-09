// ===============================
// 公务员行测竞技擂台 V6
// 稳定服务器版
// ===============================


const WebSocket = require("ws");

const fs = require("fs");




// ===============================
// 服务器
// ===============================


const PORT = process.env.PORT || 3000;


const wss = new WebSocket.Server({

    port:PORT

});



console.log(
    "服务器启动成功"
);


console.log(
    "监听端口:",
    PORT
);







// ===============================
// 加载题库（支持JSON注释）
// ===============================


let questionBank=[];



try{



    let rawData = fs.readFileSync(

        "./questions.json",

        "utf8"

    );





    // 删除 // 单行注释

    rawData = rawData.replace(

        /\/\/.*$/gm,

        ""

    );





    // 删除 /* */ 多行注释

    rawData = rawData.replace(

        /\/\*[\s\S]*?\*\//g,

        ""

    );








    let jsonData = JSON.parse(

        rawData

    );







    if(Array.isArray(jsonData)){



        questionBank=jsonData;



    }

    else if(jsonData.questions){



        questionBank=jsonData.questions;



    }

    else{



        throw new Error(

            "questions.json格式错误"

        );



    }







    console.log(


        "题库加载成功:",


        questionBank.length,


        "道"


    );







}catch(e){



    console.log(


        "题库读取失败:",


        e.message


    );



}








// ===============================
// 房间
// ===============================


let rooms={};





// 玩家数据

let players={};









// ===============================
// 随机抽题
// ===============================


function createQuestions(count,category){



    let list=[...questionBank];




    if(category){


        let temp=

        list.filter(q=>

            q.category===category

        );



        if(temp.length>0){

            list=temp;

        }


    }




    list.sort(()=>Math.random()-0.5);




    return list.slice(

        0,

        Math.min(

            count,

            list.length

        )

    );



}

// ===============================
// 玩家连接
// ===============================


wss.on("connection",socket=>{



    console.log(

        "玩家连接"

    );





    let player={


        socket:socket,


        room:null,


        id:null,


        score:0,


        index:0,


        finished:false,


        answers:[]



    };









    socket.send(JSON.stringify({


        type:"connected",


        msg:"连接服务器成功"


    }));









    socket.on("message",msg=>{



        let data;



        try{


            data=

            JSON.parse(msg);



        }catch(e){



            console.log(

                "消息格式错误"

            );


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


                100000+

                Math.random()*900000


            ).toString();







            rooms[roomId]={



                players:[player],



                status:"waiting",



                mode:data.mode || "special",



                category:data.category || null,



                count:getQuestionCount(data.mode),



                questions:[]

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



            room.status="playing";









            // 生成题目


            room.questions=

            createQuestions(


                room.count,


                room.category


            );







            console.log(


                "生成题目:",


                room.questions.length


            );









            // 通知双方开始


            room.players.forEach(p=>{



                if(p.socket.readyState===1){



                    p.socket.send(JSON.stringify({



                        type:"start",



                        player:p.id,



                        count:room.count



                    }));


                }


            });








            // 第一题


            setTimeout(()=>{



                room.players.forEach(p=>{


                    sendQuestion(p);


                });



            },500);






            return;


        }

// ===============================
// 根据模式决定题量
// ===============================


function getQuestionCount(mode){



    if(mode==="quarter"){


        return 30;


    }



    if(mode==="half"){


        return 60;


    }



    if(mode==="full"){


        return 120;


    }




    // 默认专项模式

    return 20;



}









// ===============================
// 发送题目
// ===============================


function sendQuestion(player){



    let room=

    rooms[player.room];



    if(!room)return;







    // 全部答完


    if(player.index>=room.questions.length){



        player.finished=true;





        player.socket.send(JSON.stringify({



            type:"finishQuestion"



        }));





        checkGameFinish(room);



        return;



    }







    let q=

    room.questions[player.index];








    player.socket.send(JSON.stringify({



        type:"question",



        index:player.index,



        total:room.questions.length,



        question:{



            id:q.id,



            category:q.category,



            q:q.q,



            options:q.options



        }



    }));





}











// ===============================
// 玩家答题
// ===============================


function playerAnswer(player,data){



    let room=

    rooms[player.room];



    if(!room)return;






    let q=

    room.questions[player.index];



    if(!q)return;









    let correct=

    data.choice===q.answer;









    if(correct){



        player.score+=100;



    }








    player.answers.push({



        id:q.id,



        choice:data.choice,



        correct:correct



    });









    player.index++;








    // 返回自己结果


    player.socket.send(JSON.stringify({



        type:"result",



        score:player.score,



        correct:correct



    }));









    // 通知对手


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









    setTimeout(()=>{


        sendQuestion(player);



    },300);



}








// ===============================
// 检查比赛结束
// ===============================


function checkGameFinish(room){



    let finished=

    room.players.every(p=>

        p.finished

    );







    if(!finished){


        return;


    }







    let p1=

    room.players[0];



    let p2=

    room.players[1];







    let result;



    if(p1.score>p2.score){



        result="player1";


    }

    else if(p2.score>p1.score){



        result="player2";


    }

    else{



        result="draw";


    }








    console.log(

        "比赛结束:",

        result

    );








    room.players.forEach(p=>{



        let win=false;



        if(

            result==="player"+p.id

        ){



            win=true;


        }







        p.socket.send(JSON.stringify({



            type:"gameResult",



            result:result,



            myScore:p.score,



            enemyScore:

            room.players.find(

                x=>x!==p

            ).score,



            win:win



        }));



    });



}
// ===============================
// 消息处理
// ===============================


        if(data.type==="answer"){



            playerAnswer(

                player,

                data

            );



            return;



        }









        // ===============================
        // 手动提交
        // ===============================


        if(data.type==="submit"){



            player.finished=true;



            let room=

            rooms[player.room];



            if(room){



                checkGameFinish(room);



            }



            return;


        }






    });









    // ===============================
    // 玩家离开
    // ===============================


    socket.on("close",()=>{



        console.log(



            "玩家离开",



            player.id,



            player.room



        );







        if(

            player.room &&

            rooms[player.room]

        ){



            let room=

            rooms[player.room];







            room.players=

            room.players.filter(

                p=>p!==player

            );







            // 房间没人了删除


            if(

                room.players.length===0

            ){



                delete rooms[player.room];



            }



        }



    });





});