const express = require('express');
const schedule = require('node-schedule');
const router = express.Router();
const { db } = require('../config/db');

// timedtasks
router.get('/test', async (req, res) => {
    //更新定时任务
    timedtasksFun();
    res.send({
        status: "OK"
    })
})

/**
 * 定时任务
 */
const timedtasksFun = () => {
    let sql = `select * from timedtasks where title = 'Test'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("test")
            if (result[0].isOpen == 'true') {
                // console.log(result[0].seconds);
                // setInterval(() => {
                //     console.log("哈哈");
                // }, result[0].seconds * 1000);
                schedule.scheduleJob("test", result[0].seconds, () => {
                    console.log('scheduleCronstyle:' + new Date());
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;