// 腾讯-热点
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/hotlist', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '腾讯-热点'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("hotlist")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("hotlist", result[0].seconds, async () => {
                    console.log('腾讯-热点--hotlist:' + new Date());
                    // 抓取数据
                    const browser = await puppeteer.launch({
                        headless: true //默认是无头模式,这里为了示范所以使用正常模式
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    // 在新标签中打开要爬取的网页
                    await page.goto("https://news.qq.com/");
                    // 设置页面的宽高
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    });
                    // 获取数据
                    let crawlData = async () => {
                        let data = await page.evaluate(() => {
                            let res = [];
                            let contentList = document.querySelectorAll('#rankWrap>.rankNews>li');
                            for (let i = 0; i < contentList.length; i++) {
                                // 生成id的函数
                                function algorithm() {
                                    let abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'g', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
                                    let [max, min] = [Math.floor(Math.random() * (10 - 7 + 1) + 1), Math.floor(Math.random() * (17 - 10 + 1) + 17)];
                                    abc = abc.sort(() => 0.4 - Math.random()).slice(max, min).slice(0, 8).join("");
                                    var a = new Date().getTime() + abc;
                                    return a
                                }
                                // 序号
                                let serialNumberDom = contentList[i].querySelector("i.rankIcon");
                                let serialNumber = serialNumberDom ? serialNumberDom.textContent.trim() : '';
                                // 标题
                                let titleDom = contentList[i].querySelector('a');
                                let title = titleDom ? titleDom.textContent.trim() : '';
                                let titleLink = titleDom ? titleDom.getAttribute('href') : '';
                                // 图片
                                let imgDom = contentList[i].querySelector('img.recIcon');
                                let img = imgDom ? imgDom.getAttribute('src') : '';

                                const date = new Date();
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1; // 月份是从0开始的
                                const day = date.getDate();
                                const hour = date.getHours();
                                const min = date.getMinutes();
                                const sec = date.getSeconds();
                                const newTime =
                                    year +
                                    '-' +
                                    (month < 10 ? '0' + month : month) +
                                    '-' +
                                    (day < 10 ? '0' + day : day) +
                                    ' ' +
                                    (hour < 10 ? '0' + hour : hour) +
                                    ':' +
                                    (min < 10 ? '0' + min : min) +
                                    ':' +
                                    (sec < 10 ? '0' + sec : sec)
                                res.push({
                                    id: algorithm(),
                                    date: newTime,
                                    serialNumber,
                                    title,
                                    titleLink,
                                    img
                                })
                            }
                            return res;
                        });
                        for (let i = 0; i < data.length; i++) {
                            await sleep(8000);
                            let selectSql = `select * from hotlist where title='${data[i].title}' and date = '${data[i].date}'`;
                            db.query(selectSql, (err, result) => {
                                if (err) {
                                    console.log("出错了!");
                                } else {
                                    addData(i);
                                }
                            })
                        }
                        function addData(i) {
                            let sql = `insert into hotlist(date,serialNumber,title,titleLink,img,id)
                            values('${data[i].date}','${data[i].serialNumber}','${data[i].title}','${data[i].titleLink}','${data[i].img}','${data[i].id}')`;
                            db.query(sql, (err, result) => {
                                if (err) {
                                    console.log("插入失败!");
                                } else {
                                    console.log("插入成功");
                                }
                            })
                            // 爬取详情页的数据
                            detailsPage(data[i].id, data[i].titleLink, data[i].title);
                        }
                        async function detailsPage(id, url, title) {
                            // 每新开一个页面等待一秒
                            // await sleep(1000);
                            try {
                                const browser1 = await puppeteer.launch({
                                    headless: true
                                });
                                const page1 = await browser1.newPage();
                                await page1.goto(url);
                                await page1.setViewport({
                                    width: 1440,
                                    height: 810,
                                    deviceScaleFactor: 1
                                });
                                let data = await page1.evaluate((id, url, title) => {
                                    let page1ResObj;
                                    let detailsDom = document.getElementsByClassName('content-article')[0];
                                    let detailContext = detailsDom ? detailsDom.innerHTML : '';
                                    page1ResObj = {
                                        id,
                                        url,
                                        title,
                                        detailContext
                                    };
                                    return page1ResObj;
                                }, id, url, title);
                                console.log(data);
                                // 插入详情数据
                                let sql = `insert into hotlistdetail(id,url,title,detail) 
                        values('${data.id}','${data.url}','${data.title}','${data.detailContext}')`;
                                db.query(sql, (err, result) => {
                                    if (err) {
                                        console.log("插入失败", err);
                                    } else {
                                        console.log("插入成功--详情页");
                                    }
                                })
                                await browser1.close();
                            } catch (err) {
                                await browser1.close();
                            }
                        }
                        // console.log(data);
                    }
                    for (let i = 0; i < 5; i++) {
                        await page.click('#rankWrap>.rankTitle>.rankChange');
                        crawlData();
                        await sleep(100000);
                    }
                    await browser.close();
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;