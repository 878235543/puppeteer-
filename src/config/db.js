const mysql = require('mysql');
const db = mysql.createConnection({
    host:"localhost",
    port:"3306",
    user:"root",
    password:"78963",
    database:"newsmerger"
})
db.connect((err)=>{
    if(err){
        console.log("连接失败 err");
    }else{
        console.log("连接成功 success");
    }
})
exports.db = db;

