// ===============================
// 公务员行测题库
// 服务器专用
// ===============================


const questionBank=[


{
id:1,

category:"常识判断",

question:
"新时代我国社会主要矛盾是？",

options:[

"A.人民内部矛盾",

"B.生产力与生产关系矛盾",

"C.人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾",

"D.经济基础和上层建筑矛盾"

],


// 注意：答案只存在服务器

answer:2,


explanation:
"我国社会主要矛盾已经转化为人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾。"

},




{
id:2,

category:"言语理解",

question:
"传统文化的传承不能____、墨守成规，要结合时代特色创新表达。",

options:[

"A.固步自封",

"B.邯郸学步",

"C.拾人牙慧",

"D.刚愎自用"

],

answer:0,


explanation:
"固步自封指停留在原地，不求进步。"

},




{
id:3,

category:"数学运算",

question:
"某数的3倍减8等于22，这个数是多少？",

options:[

"A.8",

"B.10",

"C.12",

"D.14"

],

answer:1,


explanation:
"设这个数为x，3x-8=22，所以x=10。"

},




{
id:4,

category:"判断推理",

question:
"以下属于从众效应的是？",

options:[

"A.坚持自己的学习方法",

"B.大家报名公考班，小李也报名",

"C.独立思考解决问题",

"D.根据自身情况选择职业"

],

answer:1,


explanation:
"跟随多数人的行为属于从众效应。"

},




{
id:5,

category:"常识判断",

question:
"我国最高国家权力机关是？",

options:[

"A.国务院",

"B.最高人民法院",

"C.全国人民代表大会",

"D.国家监察委员会"

],

answer:2,


explanation:
"全国人民代表大会是我国最高国家权力机关。"

}



];



// 随机抽题

function getQuestions(num){


    let arr=[...questionBank];


    arr.sort(()=>Math.random()-0.5);


    return arr.slice(
        0,
        Math.min(num,arr.length)
    );


}



module.exports={
    getQuestions
};