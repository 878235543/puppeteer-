// 即时热点-最热
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/immediatehotspot', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '即时热点-最热'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("immediatehotspot")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("immediatehotspot", result[0].seconds, async () => {
                    console.log('即时热点-最热--immediatehotspot:' + new Date());
                    // 启动浏览器
                    const browser = await puppeteer.launch({
                        headless: false,//默认是无头模式,这里为了示范所以使用正常模式
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    // 在新标签中打开要爬取的网页
                    await page.goto("http://www.jsrank.cn/c/news.html?type=hot");
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    });

                    // 按10下向下键,加载页面数据
                    for (let i = 0; i < 30; i++) {
                        await sleep(1000);
                        await page.keyboard.down('PageDown');
                    }

                    let data = await page.evaluate(() => {
                        let res = [];
                        let platfromList = document.querySelectorAll('.platform-list>.item');
                        for (let i = 0; i < platfromList.length; i++) {
                            // id
                            let idDom = platfromList[i].querySelector('.info');
                            let id = idDom ? idDom.getAttribute('data-id') : '';
                            // logo
                            let logoImgDom = platfromList[i].querySelector('.info>img');
                            let logoImg = logoImgDom ? logoImgDom.getAttribute('src') : '';
                            let logoAlt = logoImgDom ? logoImgDom.getAttribute('alt') : '';
                            // 大标题
                            let titleDom = platfromList[i].querySelector('.info>.platform-name>a');
                            let title = titleDom ? titleDom.textContent.trim() : '';
                            // 大标题跳转
                            let titleLink = titleDom ? titleDom.getAttribute('href') : '';
                            // 小标题
                            let rightTitleDom = platfromList[i].querySelector('.info>.source');
                            let rightTitle = rightTitleDom ? rightTitleDom.textContent.trim() : '';
                            // 内容列表
                            let contextListDom = platfromList[i].querySelector('.list.nano.has-scrollbar');
                            let contextListHtml = contextListDom ? contextListDom.innerHTML : '';
                            res.push({
                                id,
                                logoImg: `http://www.jsrank.cn${logoImg}`,
                                logoAlt,
                                title,
                                titleLink: `http://www.jsrank.cn${titleLink}`,
                                rightTitle,
                                contextListHtml: contextListHtml.replace(new RegExp(/openContent(\S*)return false;/g), '')
                            });
                        }
                        return res;
                    })
                    // console.log(data);
                    db.query('truncate table immediatehotspot', (err, data) => {
                        if (err) {
                            console.log("出错了");
                        } else {
                            addData();
                        }
                    });
                    function addData() {
                        for (let i = 0; i < data.length; i++) {
                            let sql = `insert into immediatehotspot(id,logoImg,logoAlt,title,titleLink,rightTitle,contextListHtml)
            values('${data[i].id}','${data[i].logoImg}','${data[i].logoAlt}','${data[i].title}','${data[i].titleLink}','${data[i].rightTitle}','${data[i].contextListHtml}')`
                            db.query(sql, (err, result) => {
                                if (err) {
                                    console.log("插入失败!");
                                } else {
                                    console.log("插入成功!");
                                }
                            })
                        }
                    }
                    // 关闭浏览器
                    await browser.close();
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;