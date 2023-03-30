// 金十数据-市场快讯
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/marketnews', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '金十数据-市场快讯'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("marketnews")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("marketnews", result[0].seconds, async () => {
                    console.log('金十数据-市场快讯--marketnews:' + new Date());
                    // 启动浏览器
                    const browser = await puppeteer.launch({
                        headless: false, // 默认是无头模式，这里为了示范所以使用正常模式
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    // 在新标签中打开要爬取的网页
                    await page.goto('https://www.jin10.com/')
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    })
                    // 点击十次之后再执行下面部分
                    for (let i = 0; i < 2; i++) {
                        await moreClick(page);
                    }

                    // 使用evaluate方法在浏览器中执行传入函数（完全的浏览器环境，所以函数内可以直接使用window、document等所有对象和方法）
                    let data = await page.evaluate(() => {
                        let list = document.querySelectorAll('.jin-flash-item-container.is-normal')
                        let res = [];
                        let tempTime = "";
                        for (let i = 0; i < list.length; i++) {
                            let day = list[i].querySelector('.jin-flash-date-line>.date-box>span')
                                ? list[i].querySelector('.jin-flash-date-line>.date-box>span').textContent.trim() : null;
                            if (!!day) tempTime = `${new Date().getFullYear()}年${day}`;
                            // 时间可当作id使用
                            let time = `${tempTime} ${list[i].querySelector('.jin-flash-item.flash>.item-time') ?
                                list[i].querySelector('.jin-flash-item.flash>.item-time').textContent : ""}`;
                            // 标题
                            let title = list[i].querySelector('.jin-flash-item.flash>.item-right>.right-top>.right-common>.right-common-title') ?
                                list[i].querySelector('.jin-flash-item.flash>.item-right>.right-top>.right-common>.right-common-title').textContent : "";
                            //内容
                            let context = list[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-content>div>div>div>div') ?
                                list[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-content>div>div>div>div').innerText : "";
                            //图片(只有一行文本时的图片 例如:金十图示：2023年02月02日（周四）全球汽车制造商市值变化(金十数据APP))
                            let img = list[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-pic.img-intercept.flash-pic>div>img') ?
                                list[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-pic.img-intercept.flash-pic>div>img').getAttribute("data-src") : "";
                            res.push({
                                time,
                                title,
                                context,
                                img
                            })
                        }
                        return res;
                    });

                    for (let i = 0; i < data.length; i++) {
                        let selectSql = `select * from marketnews where time='${data[i].time}'`;
                        db.query(selectSql, (err, data) => {
                            if (err) {
                                console.log("出错了!", err);
                            } else {
                                console.log("成功了!", data.length);
                                data.length < 1 && addData(i);
                            }
                        })
                    }
                    // 添加数据
                    function addData(i) {
                        let sql = `insert into marketnews(time,title,context,img) values('${data[i].time}','${data[i].title}','${data[i].context}','${data[i].img}')`;
                        db.query(sql, (err, result) => {
                            if (err) {
                                console.log("插入失败!", err);
                            } else {
                                console.log("插入成功!");
                            }
                        })
                    }
                    // 完成之后关闭浏览器
                    await browser.close();
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;