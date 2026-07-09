// ===============================
// 公务员行测竞技擂台 联机服务器 V5
// questions.json版本
// ===============================


const WebSocket = require("ws");

const fs = require("fs");



// ===============================
// 创建服务器
// ===============================


const PORT = process.env.PORT || 3000;


const wss = new WebSocket.Server({

    port:PORT

});



console.log("服务器启动成功");

console.log("监听端口:"+PORT);





// ===============================
// 加载题库
// ===============================


const rawQuestionBank = JSON.parse(


    fs.readFileSync(

        __dirname + "/questions.json",

        "utf8"

    )


);




// 转换分类JSON

const questionBank = Object.entries(rawQuestionBank)

.flatMap(([category,questions])=>{


    return questions.map(q=>({


        ...q,


        category:category


    }));


});






console.log(

"题库加载成功:",

questionBank.length,

"道"

);







// ===============================
// 抽题
// ===============================


function createQuestions(count,category){



    let list=[...questionBank];




    if(category){


        let temp=list.filter(q=>


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
// 房间数据
// ===============================


let rooms={};






// ===============================
// 发送题目
// ===============================


function sendQuestion(player){



    let room=

    rooms[player.room];



    if(!room)return;




    if(player.index>=room.questions.length){



        player.socket.send(JSON.stringify({


            type:"finishQuestion"


        }));



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
// 玩家连接
// ===============================


wss.on("connection",socket=>{



console.log("玩家连接");





let player={


    socket:socket,


    room:null,


    id:null,


    score:0,


    index:0,


    answers:[],


    finished:false



};






socket.send(JSON.stringify({


    type:"connected",


    msg:"连接服务器成功"


}));








socket.on("message",msg=>{



let data;



try{


    data=JSON.parse(msg);



}catch(e){


    console.log("错误消息");


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



    let roomId=


    Math.floor(


        100000+

        Math.random()*900000


    ).toString();







    rooms[roomId]={


        players:[player],


        status:"waiting",


        mode:data.mode || "special",


        category:data.category || null,


        count:data.count || 20,


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



        player:1,



        mode:rooms[roomId].mode,



        category:rooms[roomId].category,



        count:rooms[roomId].count



    }));






    return;


}









// ===============================
// 加入房间
// ===============================


if(data.type==="join"){



    console.log(

        "尝试加入:",

        data.room

    );






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








    // ===============================
    // 生成比赛题目
    // ===============================



    room.questions=

    createQuestions(


        room.count,


        room.category


    );







    console.log(

        "生成题目:",

        room.questions.length

    );







    console.log(

        "比赛开始:",

        data.room

    );









    // 通知双方开始


    room.players.forEach(p=>{



        if(p.socket.readyState===1){



            p.socket.send(JSON.stringify({



                type:"start",



                player:p.id,



                mode:room.mode,



                category:room.category,



                count:room.count



            }));


        }


    });









    // 发第一题


    setTimeout(()=>{


        room.players.forEach(p=>{


            sendQuestion(p);


        });



    },500);







    return;


}

// ===============================
// 答题
// ===============================


if(data.type==="answer"){



    let room=

    rooms[player.room];



    if(!room)return;





    let q=

    room.questions[player.index];




    if(!q){

        return;

    }






    let correct=

    data.choice===q.answer;







    if(correct){


        player.score+=100;


    }









    player.answers.push({


        question:q.id,


        choice:data.choice,


        correct:correct



    });








    player.index++;









    // 返回自己结果


    socket.send(JSON.stringify({



        type:"result",



        score:player.score,



        correct:correct,



        index:player.index



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









    // 下一题


    setTimeout(()=>{



        sendQuestion(player);



    },500);








    return;



}











// ===============================
// 提交比赛
// ===============================


if(data.type==="submit"){



    let room=

    rooms[player.room];



    if(!room)return;






    player.finished=true;







    console.log(

        "玩家完成:",

        player.id,

        player.score

    );






    // 检查双方是否都完成


    let allFinish =

    room.players.every(p=>p.finished);








    if(allFinish){



        let p1=room.players[0];

        let p2=room.players[1];







        let result="";



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

            "比赛结果:",

            result

        );









        room.players.forEach(p=>{



            let win=false;


            if(

                result==="draw"

            ){


                win=false;


            }

            else if(

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

    else{



        socket.send(JSON.stringify({


            type:"finish",


            player:player.id



        }));



    }





    return;



}

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



        rooms[player.room].players=



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