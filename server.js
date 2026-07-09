// ===============================
// 公务员行测竞技擂台 联机服务器 V3
// 服务器发题版本
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
// 服务器题库
// 后期可以扩展成json文件
// ===============================


const questionBank = [


{
    id:1,

    category:"常识判断",

    q:"我国最高国家权力机关是？",

    options:[

        "国务院",

        "最高人民法院",

        "全国人民代表大会",

        "国家监察委员会"

    ],

    answer:2

},



{
    id:2,

    category:"数量关系",

    q:"某数的3倍减8等于22，该数是多少？",

    options:[

        "8",

        "10",

        "12",

        "14"

    ],

    answer:1

},



{
    id:3,

    category:"判断推理",

    q:"从众效应是指个体受到群体影响改变观点，以下属于从众效应的是？",

    options:[

        "坚持自己的学习方法",

        "大家报名公考班，小李也报名",

        "独立思考解决问题",

        "根据自身情况选择职业"

    ],

    answer:1

},



{
    id:4,

    category:"言语理解",

    q:"传统文化传承不能____，要结合时代特色创新表达。",

    options:[

        "固步自封",

        "邯郸学步",

        "拾人牙慧",

        "刚愎自用"

    ],

    answer:0

},



{
    id:5,

    category:"资料分析",

    q:"若某企业去年收入100万元，今年增长20%，今年收入是多少？",

    options:[

        "110万元",

        "120万元",

        "130万元",

        "150万元"

    ],

    answer:1

}


];





// ===============================
// 随机抽题
// ===============================


function createQuestions(count,category){



    let list=[...questionBank];



    // 如果选择分类

    if(category){


        let temp=list.filter(q=>q.category===category);


        if(temp.length>0){

            list=temp;

        }

    }



    list.sort(()=>Math.random()-0.5);



    return list.slice(

        0,

        Math.min(count,list.length)

    );


}






// ===============================
// 房间
// ===============================


let rooms={};







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



    count:data.count || 20,



    questions:[]



};





player.room=roomId;


player.id=1;






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


room.questions=createQuestions(

    room.count,

    room.category

);






console.log(

"生成题目:",

room.questions.length

);








console.log(

"开始比赛:",

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






// 发送第一题


setTimeout(()=>{


room.players.forEach(p=>{


    sendQuestion(p);


});


},500);







return;



}











// ===============================
// 发送题目函数
// ===============================


function sendQuestion(player){



let room=rooms[player.room];



if(!room)return;



if(player.index>=room.questions.length){



    player.socket.send(JSON.stringify({


        type:"finishQuestion"


    }));


    return;

}





let q=room.questions[player.index];




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
// 答题
// ===============================


if(data.type==="answer"){



let room=

rooms[player.room];




if(!room)return;





let q=

room.questions[player.index];





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






// 告诉自己结果


socket.send(JSON.stringify({



type:"result",



score:player.score,



correct:correct,



index:player.index



}));







// 告诉对手进度


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
// 提交
// ===============================


if(data.type==="submit"){



let room=

rooms[player.room];



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